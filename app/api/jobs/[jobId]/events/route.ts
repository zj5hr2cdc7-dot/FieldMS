import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireJobAccess } from '@/lib/authz'
import { createJobEvent, getLatestJobEvent, getOrCreateTrackingToken } from '@/lib/tracking'
import { notifyCustomer } from '@/lib/notifications'
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

  notifyCustomer({
    eventType,
    jobTitle: job.title,
    customerPhone: job.customer_phone,
    customerEmail: job.customer_email,
    trackingUrl,
  }).catch((err) => console.error('Notification error:', err))

  return NextResponse.json({ event })
}
