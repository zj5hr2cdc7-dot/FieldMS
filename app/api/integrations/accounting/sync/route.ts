import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { syncJobToXero } from '@/lib/accounting-sync'
import { syncJobToMyob } from '@/lib/myob-sync'
import { ACCOUNTING_SYNC_ENABLED, featureDisabled } from '@/lib/features'

/**
 * POST /api/integrations/accounting/sync
 * Body: { jobId: string }
 *
 * Pushes a job's invoice and payments to whichever accounting package this
 * workspace has connected. Idempotent on both sides.
 *
 * WHY ONE ROUTE RATHER THAN /xero/sync AND /myob/sync
 *   The UI calls syncJobToAccounting(jobId) and has no idea which package the
 *   business uses — that is a server-side fact. Replacing the old
 *   /integrations/xero/sync (which hardcoded Xero despite the caller being
 *   named provider-neutrally) means neither calling page has to change, and
 *   there is one place that knows how to dispatch.
 *
 * AUTHORISATION
 *   Owner or manager. The previous route accepted any member of the tenant,
 *   so a technician could push invoices into the company's accounts. Invoicing
 *   is office work; lib/roles.ts already says so.
 */
export async function POST(request: Request) {
  let body: { jobId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const jobId = typeof body.jobId === 'string' ? body.jobId : null
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  // Switched off by default. When accounting sync goes wrong it goes wrong
  // inside somebody else's books, which is urgent, hard to unwind and lands
  // on one person's phone. MYOB has additionally never run against a real
  // company file. Turn on per-deployment via NEXT_PUBLIC_ACCOUNTING_SYNC_ENABLED
  // once there is a willing business to try it with. See lib/features.ts.
  if (!ACCOUNTING_SYNC_ENABLED) {
    return featureDisabled(
      'Accounting sync is not switched on yet. Your invoices are all still here — nothing is lost.'
    )
  }

  const admin = createAdminClient()

  const { data: job } = await admin.from('jobs').select('id, tenant_id').eq('id', jobId).maybeSingle()
  // 403 rather than 404: a 404 tells a caller which job ids are real.
  if (!job) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const authz = await requireTenantRole(job.tenant_id, ['owner', 'manager'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const { data: integration } = await admin
    .from('integrations')
    .select('provider, access_token, external_account_id')
    .eq('tenant_id', job.tenant_id)
    .eq('status', 'connected')
    .in('provider', ['xero', 'myob'])
    .maybeSingle()

  if (!integration?.access_token || !integration?.external_account_id) {
    return NextResponse.json(
      { error: 'No accounting package is connected for this workspace. Connect one under Integrations first.' },
      { status: 400 }
    )
  }

  try {
    const result =
      integration.provider === 'myob'
        ? await syncJobToMyob(job.tenant_id, jobId, {
            accessToken: integration.access_token,
            companyFileId: integration.external_account_id,
          })
        : await syncJobToXero(
            job.tenant_id,
            jobId,
            integration.access_token,
            integration.external_account_id
          )

    return NextResponse.json({
      ok: true,
      provider: integration.provider,
      invoice_external_id: result.invoice,
      payments_synced: result.payments,
      invoice_unchanged: result.skipped,
    })
  } catch (err) {
    // The message is deliberately passed through: these are things the user can
    // act on ("that customer does not exist in your MYOB file"), not internals.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed', provider: integration.provider },
      { status: 502 }
    )
  }
}
