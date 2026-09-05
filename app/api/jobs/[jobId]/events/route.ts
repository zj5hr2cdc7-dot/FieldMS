import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
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
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const event = await getLatestJobEvent(jobId)
  return NextResponse.json({ event })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const { data: membership } = await admin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', job.tenant_id)
    .eq('user_id', session.user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const event = await createJobEvent(jobId, job.tenant_id, session.user.id, eventType)

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
