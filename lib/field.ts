import { createClient } from '@/utils/supabase/client'
import type { Job } from '@/types/database'

export interface Announcement {
  id: string
  tenant_id: string
  title: string
  body: string | null
  urgent: boolean
  created_at: string
}

/** Jobs assigned to a given employee (their work only). */
export async function getMyJobs(userId: string): Promise<Job[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('assigned_to', userId)
    .in('status', ['open', 'in_progress'])
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data || []) as Job[]
}

export async function getMyJobHistory(userId: string): Promise<Job[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('assigned_to', userId)
    .eq('status', 'completed')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data || []) as Job[]
}

export async function getAnnouncements(tenantId: string): Promise<Announcement[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_announcements')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data || []) as Announcement[]
}

export function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}
