import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { assignToJob } from '@/lib/supplier-bills'

export const runtime = 'nodejs'

/**
 * POST /api/supplier-bills — office actions on a received supplier bill.
 * Body: { tenantId, id, action: 'assign' | 'ignore' | 'reopen', jobId? }
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const { tenantId, id, action, jobId } = (body ?? {}) as Record<string, unknown>
  if (typeof tenantId !== 'string' || typeof id !== 'string' || typeof action !== 'string') {
    return NextResponse.json({ error: 'tenantId, id and action are required' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner', 'manager'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()
  const { data: inv } = await admin
    .from('supplier_invoices')
    .select('id, tenant_id, cost_entry_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  try {
    if (action === 'assign') {
      if (typeof jobId !== 'string') return NextResponse.json({ error: 'Choose a job' }, { status: 400 })
      const { data: job } = await admin.from('jobs').select('id').eq('id', jobId).eq('tenant_id', tenantId).maybeSingle()
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      await assignToJob(admin, id, jobId, authz.userId)
    } else if (action === 'ignore' || action === 'reopen') {
      if (inv.cost_entry_id) await admin.from('job_cost_entries').delete().eq('id', inv.cost_entry_id)
      await admin
        .from('supplier_invoices')
        .update({
          status: action === 'ignore' ? 'ignored' : 'needs_review',
          job_id: null,
          cost_entry_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Something went wrong' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
