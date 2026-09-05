import { createClient } from '@/utils/supabase/client'
import type { JobPlan } from '@/types/database'

export async function getJobPlans(tenantId: string): Promise<JobPlan[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_plans')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadJobPlan(
  tenantId: string,
  userId: string,
  file: File,
  jobId?: string
): Promise<JobPlan> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const path = `${tenantId}/${safeName}`

  const { error: storageError } = await supabase.storage
    .from('job-plans')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (storageError) throw storageError

  const { data, error } = await supabase
    .from('job_plans')
    .insert({
      tenant_id: tenantId,
      job_id: jobId || null,
      name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
      uploaded_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function assignPlanToJob(planId: string, jobId: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('job_plans')
    .update({ job_id: jobId || null })
    .eq('id', planId)
  if (error) throw error
}

export async function deletePlan(planId: string, filePath: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from('job-plans').remove([filePath])
  const { error } = await supabase.from('job_plans').delete().eq('id', planId)
  if (error) throw error
}

export async function getPlanSignedUrl(filePath: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.storage
    .from('job-plans')
    .createSignedUrl(filePath, 3600)
  return data?.signedUrl ?? null
}
