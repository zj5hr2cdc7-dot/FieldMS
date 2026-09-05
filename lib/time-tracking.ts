import { createClient } from '@/utils/supabase/client'

export type TimeEntryKind = 'shift' | 'travel' | 'lunch' | 'overtime'

export interface TimeEntry {
  id: string
  tenant_id: string
  user_id: string
  job_id: string | null
  kind: TimeEntryKind
  started_at: string
  ended_at: string | null
  note: string | null
  submitted: boolean
  created_at: string
}

/** Currently-open (not ended) entries for the user — the live clock state. */
export async function getOpenEntries(userId: string): Promise<TimeEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data || []) as TimeEntry[]
}

export async function getEntriesInRange(userId: string, fromIso: string): Promise<TimeEntry[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('started_at', fromIso)
    .order('started_at', { ascending: false })
  if (error) throw error
  return (data || []) as TimeEntry[]
}

export async function startEntry(tenantId: string, userId: string, kind: TimeEntryKind, jobId?: string): Promise<TimeEntry> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ tenant_id: tenantId, user_id: userId, kind, job_id: jobId ?? null })
    .select()
    .single()
  if (error) throw error
  return data as TimeEntry
}

export async function endEntry(entryId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('time_entries').update({ ended_at: new Date().toISOString() }).eq('id', entryId)
  if (error) throw error
}

export async function submitTimesheet(userId: string, fromIso: string): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('time_entries')
    .update({ submitted: true })
    .eq('user_id', userId)
    .gte('started_at', fromIso)
    .not('ended_at', 'is', null)
    .eq('submitted', false)
    .select('id')
  if (error) throw error
  return (data || []).length
}

// ── Helpers ─────────────────────────────────────────────────────────────────

export function durationMinutes(entry: TimeEntry): number {
  const end = entry.ended_at ? new Date(entry.ended_at).getTime() : Date.now()
  return Math.max(0, Math.round((end - new Date(entry.started_at).getTime()) / 60000))
}

export function formatHm(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${String(m).padStart(2, '0')}m`
}

/** Net worked minutes = shift + overtime, minus lunch, within a set of entries. */
export function netWorkedMinutes(entries: TimeEntry[]): number {
  let worked = 0
  let lunch = 0
  for (const e of entries) {
    const mins = durationMinutes(e)
    if (e.kind === 'shift' || e.kind === 'overtime') worked += mins
    else if (e.kind === 'lunch') lunch += mins
  }
  return Math.max(0, worked - lunch)
}

export function startOfWeekIso(): string {
  const d = new Date()
  const diff = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
