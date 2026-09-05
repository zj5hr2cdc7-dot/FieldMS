import type { JobPhoto, JobReport } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

const BUCKET = 'job-photos'

export async function getPhotosForJob(jobId: string): Promise<JobPhoto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('taken_at', { ascending: true })
  if (error) throw error
  return (data || []) as JobPhoto[]
}

export async function uploadJobPhoto(
  tenantId: string,
  jobId: string,
  userId: string,
  file: File,
  caption?: string
): Promise<JobPhoto> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${tenantId}/${jobId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (storageError) throw storageError

  const { data, error } = await supabase
    .from('job_photos')
    .insert({
      tenant_id: tenantId,
      job_id: jobId,
      file_path: path,
      caption: caption || null,
      uploaded_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data as JobPhoto
}

export async function updatePhotoCaption(photoId: string, caption: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_photos').update({ caption }).eq('id', photoId)
  if (error) throw error
}

export async function deleteJobPhoto(photo: JobPhoto): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([photo.file_path])
  const { error } = await supabase.from('job_photos').delete().eq('id', photo.id)
  if (error) throw error
}

export async function getPhotoSignedUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 3600)
  return data?.signedUrl ?? null
}

// ── Site reports ───────────────────────────────────────────────────────────

export async function createJobReport(input: {
  tenantId: string
  jobId: string
  userId: string
  title: string
  summary: string
  photoIds: string[]
}): Promise<JobReport> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_reports')
    .insert({
      tenant_id: input.tenantId,
      job_id: input.jobId,
      title: input.title,
      summary: input.summary || null,
      photo_ids: input.photoIds,
      created_by: input.userId,
    })
    .select()
    .single()
  if (error) throw error
  return data as JobReport
}

export async function getReportsForTenant(tenantId: string): Promise<JobReport[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_reports')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as JobReport[]
}

export function reportUrl(report: Pick<JobReport, 'token'>): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/report/${report.token}`
}

/** Send the report link to the customer via SMS + email (server route). */
export async function sendReportToCustomer(reportId: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/reports/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId }),
  })
  const body = await res.json()
  if (!res.ok) return { ok: false, error: body.error || 'Failed to send' }
  return { ok: true }
}
