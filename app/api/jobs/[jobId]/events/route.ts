import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireJobAccess } from '@/lib/authz'
import { createJobEvent, getLatestJobEvent, getOrCreateTrackingToken } from '@/lib/tracking'
import { notifyCustomer, anyDelivered, describeDelivery, type DeliveryResult } from '@/lib/notifications'
import { maybeSendReviewRequest } from '@/lib/customer-messaging'
import type { JobEventType, JobStatus } from '@/types/database'

const EVENT_TO_STATUS: Record<JobEventType, JobStatus> = {
  travel_started: 'in_progress',
  job_started: 'in_progress',
  job_completed: 'completed',
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // This used to check only that SOMEBODY was signed in, then read the event
  // through the service-role client — so any authenticated user of any
  // workspace could read any job's event history by supplying its id. A
  // textbook IDOR, and the service role meant RLS could not catch it.
  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const event = await getLatestJobEvent(jobId)
  return NextResponse.json({ event })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Membership of the job's tenant, resolved from the job rather than from
  // anything the caller sent, and on a revalidated session (getUser) rather
  // than a locally-decoded cookie (getSession).
  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const body = await request.json()
  const eventType = body?.event_type as JobEventType | undefined
  if (!eventType || !['travel_started', 'job_started', 'job_completed'].includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: job, error: jobError } = await admin
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const event = await createJobEvent(jobId, job.tenant_id, authz.userId, eventType)

  await admin
    .from('jobs')
    .update({ status: EVENT_TO_STATUS[eventType] })
    .eq('id', jobId)

  let trackingUrl: string | null = null
  if (eventType === 'travel_started') {
    try {
      const tokenRow = await getOrCreateTrackingToken(jobId)
      const origin = new URL(request.url).origin
      trackingUrl = `${origin}/track/${tokenRow.token}`
    } catch {
      // non-fatal
    }
  }

  const [{ data: tenant }, { data: branding }] = await Promise.all([
    admin.from('tenants').select('name').eq('id', job.tenant_id).single(),
    admin.from('tenant_branding').select('trading_name').eq('tenant_id', job.tenant_id).maybeSingle(),
  ])
  const businessName = branding?.trading_name || tenant?.name || 'Your contractor'

  /*
   * Awaited, but never allowed to fail the request.
   *
   * It used to be fire-and-forget. Two problems with that: on a serverless
   * host the function can freeze before an un-awaited promise runs, so the
   * customer notification might never be attempted at all (the same reason
   * the review request below is awaited); and the outcome was thrown away, so
   * nobody ever learned the message had not gone.
   *
   * Marking a job started must not fail because Twilio is down, so the result
   * rides along in the response instead and the UI can say "started, but the
   * customer was not notified".
   */
  let delivery: DeliveryResult | null = null
  try {
    delivery = await notifyCustomer({
      tenantId: job.tenant_id,
      eventType,
      jobTitle: job.title,
      businessName,
      customerPhone: job.customer_phone,
      customerEmail: job.customer_email,
      trackingUrl,
    })
    if (!anyDelivered(delivery)) {
      console.warn(`Customer not notified for job ${jobId}: ${describeDelivery(delivery)}`)
    }
  } catch (err) {
    console.error('Notification error:', err)
  }

  // Google review request, if the business has switched it on. Awaited so it
  // runs before the function is frozen on serverless hosts; it never throws
  // into the response because a failed review text must not undo completion.
  if (eventType === 'job_completed') {
    try {
      await maybeSendReviewRequest(jobId, new URL(request.url).origin, authz.userId)
    } catch (err) {
      console.error('Review request failed:', err)
    }
  }

  return NextResponse.json({
    event,
    // null when the notification threw outright; otherwise the per-channel
    // outcome, so the client can tell the user if nothing reached the customer.
    notification: delivery,
    notificationMessage: delivery ? describeDelivery(delivery) : null,
  })
}
