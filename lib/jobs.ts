import type { Job, JobAssignment, JobStatus, JobPriority } from '@/types/database'
import { createClient } from '@/utils/supabase/client'
import {
  getAS3000ClauseForJob,
  formatClauseReferenceText,
  getDiagramReferencesForJob,
  FaultfinderDiagram,
} from '@/lib/as3000'

// Client-side job functions
export async function getJobs(tenantId: string): Promise<Job[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getJob(jobId: string): Promise<Job | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

async function attachClauseReference(description: string | null, title: string) {
  const clause = getAS3000ClauseForJob(title, description || '')
  const diagramMatches = getDiagramReferencesForJob(title, description || '')

  const trimmedDescription = description?.trim() || ''
  const lines: string[] = trimmedDescription ? [trimmedDescription] : []

  if (clause) {
    const referenceText = `Electrical standard reference: ${formatClauseReferenceText(clause)}`
    if (!trimmedDescription.includes(referenceText)) {
      lines.push(referenceText)
    }
  }

  diagramMatches.forEach((diagram) => {
    const diagramText = `Diagnostic diagram: ${diagram.title}`
    if (!lines.includes(diagramText)) {
      lines.push(diagramText)
    }
  })

  return lines.join('\n\n') || null
}

export async function createJob(
  tenantId: string,
  userId: string,
  jobData: {
    title: string
    description?: string
    priority?: JobPriority
    estimated_hours?: number
    due_date?: string
    assigned_to?: string
    customer_name?: string
    customer_phone?: string
    customer_email?: string
    customer_address?: string
    recurrence?: import('@/types/database').JobRecurrence
    recurrence_until?: string
    scheduled_start?: string
  }
): Promise<Job> {
  const supabase = createClient()

  const descriptionWithClause = await attachClauseReference(jobData.description ?? null, jobData.title)

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      tenant_id: tenantId,
      title: jobData.title,
      description: descriptionWithClause,
      priority: jobData.priority || 'medium',
      estimated_hours: jobData.estimated_hours,
      due_date: jobData.due_date,
      created_by: userId,
      assigned_to: jobData.assigned_to,
      status: jobData.assigned_to ? 'in_progress' : 'open',
      customer_name: jobData.customer_name ?? null,
      customer_phone: jobData.customer_phone ?? null,
      customer_email: jobData.customer_email ?? null,
      customer_address: jobData.customer_address ?? null,
      recurrence: jobData.recurrence ?? 'none',
      recurrence_until: jobData.recurrence_until ?? null,
      scheduled_start: jobData.scheduled_start ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateJob(
  jobId: string,
  updates: Partial<{
    title: string
    description: string
    status: JobStatus
    priority: JobPriority
    estimated_hours: number
    due_date: string
    assigned_to: string
  }>
): Promise<Job> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteJob(jobId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId)

  if (error) throw error
}

export async function assignJobToUser(jobId: string, userId: string): Promise<void> {
  const supabase = createClient()

  const job = await getJob(jobId)
  if (!job) {
    throw new Error('Job not found')
  }

  const descriptionWithClause = await attachClauseReference(job.description, job.title)

  // First update the job with the clause reference included
  const { error: jobError } = await supabase
    .from('jobs')
    .update({ assigned_to: userId, status: 'in_progress', description: descriptionWithClause })
    .eq('id', jobId)

  if (jobError) throw jobError

  // Then create the assignment record
  const { error: assignmentError } = await supabase
    .from('job_assignments')
    .insert({ job_id: jobId, user_id: userId })

  if (assignmentError) throw assignmentError
}

export async function unassignJob(jobId: string): Promise<void> {
  const supabase = createClient()

  // Update job status and remove assignment
  const { error: jobError } = await supabase
    .from('jobs')
    .update({ assigned_to: null, status: 'open' })
    .eq('id', jobId)

  if (jobError) throw jobError

  // Remove assignment record
  const { error: assignmentError } = await supabase
    .from('job_assignments')
    .delete()
    .eq('job_id', jobId)

  if (assignmentError) throw assignmentError
}

export async function getJobAssignments(jobId: string): Promise<JobAssignment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('job_assignments')
    .select('*')
    .eq('job_id', jobId)

  if (error) throw error
  return data || []
}

export async function getUserJobs(userId: string): Promise<Job[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('assigned_to', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
