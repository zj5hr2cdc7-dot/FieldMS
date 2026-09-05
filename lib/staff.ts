/**
 * Owner/admin-side staff management: post announcements, review and approve
 * submitted timesheets. All reads/writes are RLS-scoped to the tenant, and the
 * announcement/timesheet-approval policies require owner/admin role.
 */

import { createClient } from '@/utils/supabase/client'
import type { Announcement } from '@/lib/field'
import type { TimeEntry } from '@/lib/time-tracking'

// ── Announcements ───────────────────────────────────────────────────────────

export async function postAnnouncement(
  tenantId: string,
  userId: string,
  input: { title: string; body?: string; urgent?: boolean }
): Promise<Announcement> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('company_announcements')
    .insert({ tenant_id: tenantId, created_by: userId, title: input.title, body: input.body ?? null, urgent: input.urgent ?? false })
    .select()
    .single()
  if (error) throw error
  return data as Announcement
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('company_announcements').delete().eq('id', id)
  if (error) throw error
}

// ── Timesheets (tenant-wide, for payroll review) ────────────────────────────

export interface TimesheetRow extends TimeEntry {
  workerName: string
}

/**
 * All completed time entries for the tenant since a date, with worker names.
 * time_entries.user_id references auth.users, so we resolve names from the
 * profiles table in a second query (profiles.id === user id).
 */
export async function getTenantTimesheets(tenantId: string, fromIso: string): Promise<TimesheetRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('started_at', fromIso)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
  if (error) throw error

  const entries = (data || []) as TimeEntry[]
  const userIds = [...new Set(entries.map((e) => e.user_id))]
  const names = new Map<string, string>()
  if (userIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds)
    for (const p of profiles || []) names.set(p.id, p.full_name || p.email || 'Unknown')
  }

  return entries.map((e) => ({ ...e, workerName: names.get(e.user_id) ?? 'Unknown' }))
}
