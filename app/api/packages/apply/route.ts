import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { resolvePrice, DEFAULT_PRICING_SETTINGS } from '@/lib/pricing/engine'
import type { TenantPricingSettings } from '@/types/pricing'
import type { JobPackageItem } from '@/types/database'

/**
 * POST /api/packages/apply
 *
 * Prices a job package and, unless dryRun, appends the resulting lines to a
 * job's billing.
 *
 * WHY THIS IS A SERVER ROUTE
 *   Because this is where money is decided. If the browser worked out what a
 *   package costs and posted the totals, anyone could open the dev tools and
 *   bill themselves a $0 switchboard. The client sends an id and a markup; the
 *   server looks up every price itself. Nothing price-shaped is accepted from
 *   the request.
 *
 *   resolvePrice() also needs the service-role client, so it could not run in
 *   the browser even if that were safe.
 *
 * AUTHORISATION
 *   Owner and manager only. Applying a package is a pricing action, and a
 *   technician can see what a job costs but not set it. The RLS in migration
 *   028 says the same thing; this route uses the service role and therefore
 *   bypasses RLS, so the check here is the one actually doing the work.
 */

interface ApplyBody {
  tenantId?: unknown
  jobId?: unknown
  packageId?: unknown
  markupPercent?: unknown
  defaultRatePerHour?: unknown
  dryRun?: unknown
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(request: Request) {
  let body: ApplyBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : null
  const packageId = typeof body.packageId === 'string' ? body.packageId : null
  const jobId = typeof body.jobId === 'string' ? body.jobId : null
  const dryRun = body.dryRun !== false

  // Clamp rather than trust. A negative markup would bill below cost and a
  // wild one is almost certainly a UI bug rather than an intention.
  const markupPercent = Math.min(Math.max(Number(body.markupPercent) || 0, 0), 500)
  const defaultRatePerHour = Math.min(Math.max(Number(body.defaultRatePerHour) || 0, 0), 10_000)

  if (!tenantId || !packageId) {
    return NextResponse.json({ error: 'tenantId and packageId are required' }, { status: 400 })
  }
  if (!dryRun && !jobId) {
    return NextResponse.json({ error: 'jobId is required to apply a package' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner', 'manager'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()

  // Load the package, scoped to the caller's tenant so a package id from
  // another business resolves to nothing rather than to their pricing.
  const { data: pkg } = await admin
    .from('job_packages')
    .select('id, name, tenant_id, items:job_package_items(*)')
    .eq('id', packageId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  // Same check for the job: a caller may only bill a job in their own tenant.
  if (!dryRun) {
    const { data: job } = await admin
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const items = ([...(pkg.items ?? [])] as JobPackageItem[]).sort(
    (a, b) => a.sort_order - b.sort_order
  )

  // Pricing settings decide which market figure a live lookup lands on.
  const { data: settingsRow } = await admin
    .from('tenant_pricing_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const settings: TenantPricingSettings = settingsRow ?? {
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
    ...DEFAULT_PRICING_SETTINGS,
  }

  // Resolve every catalogue price once, in parallel.
  const productIds = [
    ...new Set(
      items
        .filter((i) => i.kind === 'material' && i.master_product_id && i.unit_cost_override === null)
        .map((i) => i.master_product_id as string)
    ),
  ]
  const resolvedById = new Map<string, { price: number; sourceLabel: string }>()
  await Promise.all(
    productIds.map(async (id) => {
      try {
        const r = await resolvePrice(tenantId, id, settings)
        resolvedById.set(id, { price: Number(r.price), sourceLabel: r.sourceLabel })
      } catch {
        // Left out of the map; the line below turns that into a warning
        // rather than a silent $0.
      }
    })
  )

  const lines = []
  const warnings: string[] = []
  let totalCost = 0
  let totalRevenue = 0

  for (const item of items) {
    if (item.kind === 'labour') {
      const rate = item.rate_per_hour !== null ? Number(item.rate_per_hour) : defaultRatePerHour
      const hours = Number(item.hours ?? 0)
      const cost = round2(hours * rate)
      const revenue = round2(cost * (1 + markupPercent / 100))

      if (rate === 0) {
        warnings.push(`"${item.description}" has no labour rate — it will bill at $0.`)
      }

      totalCost += cost
      totalRevenue += revenue
      lines.push({
        kind: 'labour' as const,
        description: item.description,
        masterProductId: null as string | null,
        hours,
        ratePerHour: rate,
        quantity: null,
        unitCost: null,
        priceSource: item.rate_per_hour !== null ? 'Fixed rate' : 'Default labour rate',
        cost,
        revenue,
      })
      continue
    }

    const quantity = Number(item.quantity ?? 0)
    let unitCost: number | null = null
    let priceSource: string | null = null

    if (item.unit_cost_override !== null) {
      unitCost = Number(item.unit_cost_override)
      priceSource = 'Fixed price'
    } else if (item.master_product_id) {
      const resolved = resolvedById.get(item.master_product_id)
      if (resolved) {
        unitCost = resolved.price
        priceSource = resolved.sourceLabel
      } else {
        warnings.push(`No current price for "${item.description}" — it will bill at $0 until a price is available.`)
        unitCost = 0
        priceSource = 'Unpriced'
      }
    }

    const cost = round2(quantity * (unitCost ?? 0))
    const revenue = round2(cost * (1 + markupPercent / 100))
    totalCost += cost
    totalRevenue += revenue

    lines.push({
      kind: 'material' as const,
      description: item.description,
      masterProductId: item.master_product_id,
      hours: null,
      ratePerHour: null,
      quantity,
      unitCost,
      priceSource,
      cost,
      revenue,
    })
  }

  const preview = {
    packageId: pkg.id,
    packageName: pkg.name,
    lines,
    totalCost: round2(totalCost),
    totalRevenue: round2(totalRevenue),
    warnings,
  }

  if (dryRun) return NextResponse.json({ preview })

  if (!lines.length) {
    return NextResponse.json({ error: 'This package has no lines to add' }, { status: 400 })
  }

  // Append. Deliberately not the replace strategy used by saveBillingItems():
  // applying a package adds to whatever is already on the job.
  // masterProductId rides on the line itself rather than being matched back by
  // array index. Index alignment between `lines` and `items` happens to hold
  // today, but it would break silently the moment a line is filtered or
  // reordered, and the symptom would be billing lines pointing at the wrong
  // product.
  const rows = lines.map((line) => ({
    job_id: jobId,
    tenant_id: tenantId,
    kind: line.kind,
    description: line.description,
    hours: line.hours ?? 0,
    rate_per_hour: line.ratePerHour ?? 0,
    quantity: line.quantity,
    unit_cost: line.unitCost,
    master_product_id: line.masterProductId,
    price_source: line.priceSource,
    markup_percent: markupPercent,
    revenue: line.revenue,
    cost: line.cost,
    created_by: authz.userId,
    source_package_id: pkg.id,
  }))

  const { error } = await admin.from('job_billing_items').insert(rows)
  if (error) {
    console.error('Failed to apply package to job:', error)
    return NextResponse.json({ error: 'Could not add these lines to the job' }, { status: 500 })
  }

  return NextResponse.json({ preview })
}
