import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireJobAccess } from '@/lib/authz'
import { isOffice } from '@/lib/roles'
import { captureVariationBaseline } from '@/lib/job-costing-server'

/**
 * POST /api/jobs/:jobId/cost-baseline
 *
 * Captures a cost baseline for a variation the OFFICE approved from the
 * dashboard, as opposed to the customer approving it through the public
 * link (which /api/variations/[token] handles).
 *
 * WHY A ROUTE AND NOT A CLIENT WRITE
 *   job_cost_baselines has no INSERT policy, deliberately: an approved price
 *   must not be editable from a browser. So the dashboard cannot write one
 *   itself even as the owner. It asks the server, the server re-checks who is
 *   asking, and the service-role client does the write.
 *
 * The variation is re-read server-side and checked to belong to this job and
 * this tenant. The client sends an id, never any figures: the amounts come
 * from the database row, so a tampered request cannot inflate a baseline.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  // Costing is office-only everywhere else; it is office-only here too.
  if (!isOffice(authz.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const variationId = typeof body?.variationId === 'string' ? body.variationId : null
  if (!variationId) {
    return NextResponse.json({ error: 'variationId is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: variation } = await admin
    .from('job_variations')
    .select('id, tenant_id, job_id, status, total_ex_gst, labour_cost, material_cost')
    .eq('id', variationId)
    .maybeSingle()

  // Scoped to the job in the URL, which requireJobAccess already tied to a
  // tenant the caller belongs to. Without this check an owner of tenant A
  // could capture a baseline against tenant B's variation.
  if (!variation || variation.job_id !== jobId || variation.tenant_id !== authz.tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only an approved variation has a quoted position worth freezing.
  if (!['approved', 'completed'].includes(variation.status as string)) {
    return NextResponse.json({ error: 'Variation is not approved' }, { status: 409 })
  }

  try {
    await captureVariationBaseline(admin, variation)
  } catch (err) {
    console.error('Cost baseline capture failed (office variation):', err)
    return NextResponse.json({ error: 'Could not capture the baseline' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
