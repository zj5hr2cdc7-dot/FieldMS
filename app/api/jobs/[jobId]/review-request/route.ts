import { NextResponse } from 'next/server'
import { requireJobAccess } from '@/lib/authz'
import { maybeSendReviewRequest } from '@/lib/customer-messaging'

/**
 * POST /api/jobs/:jobId/review-request — send the automatic Google review
 * request for a completed job, if the business has it switched on.
 *
 * The field app's Complete button goes through /api/jobs/:id/events, which
 * calls this logic itself. The office jobs list changes status directly in
 * the database, so it calls this afterwards. Safe to call any number of
 * times: a job is only ever asked once.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  try {
    const outcome = await maybeSendReviewRequest(jobId, new URL(request.url).origin, authz.userId)
    return NextResponse.json({ outcome })
  } catch (err) {
    console.error('Review request failed:', err)
    return NextResponse.json({ error: 'Review request failed' }, { status: 500 })
  }
}
