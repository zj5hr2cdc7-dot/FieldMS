import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/export?tenantId=… — owner downloads everything their workspace
 * holds, as one JSON file. The landing page promises early users they can
 * export their data and walk away; this is that promise.
 *
 * Read with the admin client but strictly filtered to the caller's tenant,
 * after an owner check. Secrets (OAuth tokens, Stripe ids) are left out.
 */
const TENANT_TABLES: { table: string; column: string; omit?: string[] }[] = [
  { table: 'customers', column: 'tenant_id', omit: ['unsubscribe_token'] },
  { table: 'sites', column: 'tenant_id' },
  { table: 'jobs', column: 'tenant_id' },
  { table: 'estimates', column: 'business_id' },
  { table: 'job_invoices', column: 'tenant_id' },
  { table: 'job_variations', column: 'tenant_id' },
  { table: 'job_payments', column: 'tenant_id' },
  { table: 'job_billing_items', column: 'tenant_id' },
  { table: 'job_test_sheets', column: 'tenant_id' },
  { table: 'job_photos', column: 'tenant_id' },
  { table: 'job_reports', column: 'tenant_id' },
  { table: 'assets', column: 'tenant_id' },
  { table: 'time_entries', column: 'tenant_id' },
  { table: 'job_packages', column: 'tenant_id' },
  { table: 'tenant_material_kits', column: 'tenant_id' },
  { table: 'billing_audit_events', column: 'tenant_id' },
]

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get('tenantId') ?? ''
  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()
  const { data: tenant } = await admin.from('tenants').select('*').eq('id', tenantId).single()

  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    format: 'FieldMS export v1',
    workspace: tenant,
  }
  const missing: string[] = []

  for (const { table, column, omit } of TENANT_TABLES) {
    const rows: Record<string, unknown>[] = []
    // Page through so a large workspace is not cut off at the default limit.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from(table).select('*').eq(column, tenantId).range(from, from + 999)
      if (error) {
        missing.push(table)
        break
      }
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    out[table] = omit ? rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !omit.includes(k)))) : rows
  }

  // Child rows that hang off a parent rather than carrying tenant_id.
  const estimateIds = ((out.estimates as { id: string }[]) ?? []).map((e) => e.id)
  const invoiceIds = ((out.job_invoices as { id: string }[]) ?? []).map((i) => i.id)
  if (estimateIds.length) {
    const { data } = await admin.from('estimate_items').select('*').in('estimate_id', estimateIds)
    out.estimate_items = data ?? []
  }
  if (invoiceIds.length) {
    const { data } = await admin.from('job_invoice_items').select('*').in('invoice_id', invoiceIds)
    out.job_invoice_items = data ?? []
  }
  if (missing.length) out.not_exported = missing

  const slug = String(tenant?.name ?? 'workspace').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const date = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="fieldms-${slug || 'workspace'}-${date}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
