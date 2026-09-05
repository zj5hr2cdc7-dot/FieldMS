import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { syncJobToXero } from '@/lib/accounting-sync'

/**
 * POST /api/integrations/xero/sync
 * Body: { jobId: string }
 * Pushes the job's invoice + all payments to Xero, idempotently.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const jobId = body?.jobId as string | undefined
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Resolve job → tenant, and confirm the caller is a member of that tenant
  const { data: job } = await admin.from('jobs').select('id, tenant_id').eq('id', jobId).single()
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', job.tenant_id)
    .eq('user_id', user.id)
    .single()
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Connected Xero integration
  const { data: integration } = await admin
    .from('integrations')
    .select('*')
    .eq('tenant_id', job.tenant_id)
    .eq('provider', 'xero')
    .eq('status', 'connected')
    .single()

  if (!integration?.access_token || !integration?.external_account_id) {
    return NextResponse.json(
      { error: 'Xero is not connected for this workspace. Connect it under Integrations first.' },
      { status: 400 }
    )
  }

  try {
    const result = await syncJobToXero(
      job.tenant_id,
      jobId,
      integration.access_token,
      integration.external_account_id
    )
    return NextResponse.json({
      ok: true,
      invoice_external_id: result.invoice,
      payments_synced: result.payments,
      invoice_unchanged: result.skipped,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Sync failed' }, { status: 502 })
  }
}
