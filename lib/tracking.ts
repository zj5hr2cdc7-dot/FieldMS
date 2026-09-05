import { createAdminClient } from '@/utils/supabase/admin'
import type { Job, JobEvent, JobLocationUpdate, JobTrackingToken, JobEventType } from '@/types/database'

export async function getOrCreateTrackingToken(jobId: string): Promise<JobTrackingToken> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('job_tracking_tokens')
    .select('*')
    .eq('job_id', jobId)
    .single()

  if (existing) return existing as JobTrackingToken

  const { data, error } = await admin
    .from('job_tracking_tokens')
    .insert({ job_id: jobId })
    .select('*')
    .single()

  if (error) throw error
  return data as JobTrackingToken
}

export async function getTrackingDataByToken(token: string): Promise<{
  job: Job
  latestLocation: JobLocationUpdate | null
  latestEvent: JobEvent | null
} | null> {
  const admin = createAdminClient()

  const { data: tokenRow } = await admin
    .from('job_tracking_tokens')
    .select('job_id')
    .eq('token', token)
    .single()

  if (!tokenRow) return null

  const { data: job } = await admin
    .from('jobs')
    .select('*')
    .eq('id', tokenRow.job_id)
    .single()

  if (!job) return null

  const { data: locations } = await admin
    .from('job_location_updates')
    .select('*')
    .eq('job_id', tokenRow.job_id)
    .order('recorded_at', { ascending: false })
    .limit(1)

  const { data: events } = await admin
    .from('job_events')
    .select('*')
    .eq('job_id', tokenRow.job_id)
    .order('created_at', { ascending: false })
    .limit(1)

  return {
    job: job as Job,
    latestLocation: (locations?.[0] as JobLocationUpdate) ?? null,
    latestEvent: (events?.[0] as JobEvent) ?? null,
  }
}

export async function getLatestJobEvent(jobId: string): Promise<JobEvent | null> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('job_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(1)

  return (data?.[0] as JobEvent) ?? null
}

export async function createJobEvent(
  jobId: string,
  tenantId: string,
  userId: string,
  eventType: JobEventType
): Promise<JobEvent> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('job_events')
    .insert({ job_id: jobId, tenant_id: tenantId, event_type: eventType, created_by: userId })
    .select('*')
    .single()

  if (error) throw error
  return data as JobEvent
}

export async function insertLocationUpdate(
  jobId: string,
  tenantId: string,
  lat: number,
  lng: number,
  accuracy: number | null
): Promise<void> {
  const admin = createAdminClient()

  const { error } = await admin
    .from('job_location_updates')
    .insert({ job_id: jobId, tenant_id: tenantId, lat, lng, accuracy })

  if (error) throw error
}
