import { NextResponse } from 'next/server'
import { requireTenantRole } from '@/lib/authz'
import { readyConnectors } from '@/lib/pricing/connectors'
import { refreshSupplier, type RefreshResult } from '@/lib/pricing/engine'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/pricing/refresh — "refresh prices now", from the Materials page.
 *
 * WHAT CHANGED AND WHY
 *   This used to accept ANY signed-in user, with no tenant check and no rate
 *   limit. Three problems with that, all stemming from the same fact: this
 *   route writes to master_products, supplier_products, price_snapshots and
 *   price_changes, which are SHARED BY EVERY TENANT.
 *
 *     1. A technician in any workspace could move the catalogue that every
 *        other business quotes from. Pricing is office work; lib/roles.ts
 *        already says so everywhere else.
 *     2. No rate limit on a route that calls out to supplier feeds. Hammering
 *        it costs money and risks getting a feed credential throttled or
 *        banned — and the damage lands on every tenant, not just the caller.
 *     3. It was indistinguishable from the scheduled run, so sync_runs could
 *        not tell "the cron did this" from "someone clicked a button".
 *
 *   Now: owner or manager, a cooldown, and the scheduled job lives separately
 *   at /api/cron/pricing (which also does per-tenant trade pricing, something
 *   this route never did).
 *
 * The cron path has been removed from here. A scheduler hitting this endpoint
 * would only do half the job; vercel.json points at /api/cron/pricing.
 */

/**
 * Minimum gap between manual refreshes, per tenant.
 *
 * In-memory, so it resets on cold start and does not coordinate across
 * serverless instances — the same caveat as the AI rate limiter. It stops a
 * stuck button and an impatient user, not a determined attacker. The real
 * protection is that this is now owner/manager only.
 */
const COOLDOWN_MS = 5 * 60 * 1000
const lastRefresh = new Map<string, number>()

export async function POST(request: Request) {
  let body: { tenantId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : null
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner', 'manager'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const previous = lastRefresh.get(tenantId)
  if (previous && Date.now() - previous < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - previous)) / 1000)
    return NextResponse.json(
      {
        error: `Prices were refreshed a moment ago. Try again in ${Math.ceil(wait / 60)} minute(s).`,
      },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    )
  }
  lastRefresh.set(tenantId, Date.now())

  const results: RefreshResult[] = []
  const failures: { supplier: string; error: string }[] = []

  for (const connector of readyConnectors()) {
    try {
      results.push(await refreshSupplier(connector.key))
    } catch (err) {
      failures.push({
        supplier: connector.name,
        error: err instanceof Error ? err.message : 'Refresh failed',
      })
    }
  }

  // Connectors with no live feed are skipped by readyConnectors() rather than
  // counted as failures — a feed that does not exist yet is not an error.
  return NextResponse.json({
    ok: failures.length === 0,
    suppliersRefreshed: results.length,
    results,
    failures,
  })
}
