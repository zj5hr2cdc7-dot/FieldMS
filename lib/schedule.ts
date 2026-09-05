import type { Job, JobRecurrence, Tenant, TenantMember, Profile } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

// ── Working hours ──────────────────────────────────────────────────────────

export interface WorkHours {
  startMinutes: number
  endMinutes: number
  workingDays: number[] // 1=Mon .. 7=Sun
}

function parseTime(value: string | null, fallback: string): number {
  const [h, m] = (value || fallback).split(':').map(Number)
  return h * 60 + (m || 0)
}

export function getWorkHours(tenant: Tenant | null): WorkHours {
  return {
    startMinutes: parseTime(tenant?.work_day_start ?? null, '07:00'),
    endMinutes: parseTime(tenant?.work_day_end ?? null, '15:30'),
    workingDays: tenant?.working_days?.length ? tenant.working_days : [1, 2, 3, 4, 5],
  }
}

export function dailyCapacityHours(hours: WorkHours): number {
  return Math.max(0, (hours.endMinutes - hours.startMinutes) / 60)
}

/** ISO day of week, 1=Mon..7=Sun */
function isoDay(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1
}

export function isWorkingDay(date: Date, hours: WorkHours): boolean {
  return hours.workingDays.includes(isoDay(date))
}

/** Shift a date forward to the next working day (inclusive). */
export function toWorkingDay(date: Date, hours: WorkHours): Date {
  const result = new Date(date)
  let guard = 0
  while (!isWorkingDay(result, hours) && guard < 14) {
    result.setDate(result.getDate() + 1)
    guard += 1
  }
  return result
}

// ── Recurrence (work-hours aware — fixes ServiceM8's 24h-block bug) ───────

function addRecurrenceStep(date: Date, recurrence: JobRecurrence): Date {
  const next = new Date(date)
  if (recurrence === 'weekly') next.setDate(next.getDate() + 7)
  else if (recurrence === 'fortnightly') next.setDate(next.getDate() + 14)
  else if (recurrence === 'monthly') next.setMonth(next.getMonth() + 1)
  return next
}

/**
 * Expands a recurring job into occurrence dates. Occurrences land on working
 * days only — if a monthly visit falls on a Sunday, it books the next working
 * day rather than silently appearing on the weekend calendar.
 */
export function expandRecurrenceDates(
  startDate: Date,
  recurrence: JobRecurrence,
  until: Date,
  hours: WorkHours,
  maxOccurrences = 52
): Date[] {
  if (recurrence === 'none') return []
  const dates: Date[] = []
  let cursor = addRecurrenceStep(startDate, recurrence)
  while (cursor <= until && dates.length < maxOccurrences) {
    dates.push(toWorkingDay(cursor, hours))
    cursor = addRecurrenceStep(cursor, recurrence)
  }
  return dates
}

/** Creates child jobs for a recurring parent. Returns how many were created. */
export async function createRecurringOccurrences(parent: Job, tenant: Tenant | null): Promise<number> {
  if (parent.recurrence === 'none' || !parent.due_date || !parent.recurrence_until) return 0
  const hours = getWorkHours(tenant)
  const dates = expandRecurrenceDates(
    new Date(parent.due_date),
    parent.recurrence,
    new Date(parent.recurrence_until),
    hours
  )
  if (dates.length === 0) return 0

  const supabase = createClient()
  const rows = dates.map((date) => ({
    tenant_id: parent.tenant_id,
    title: parent.title,
    description: parent.description,
    priority: parent.priority,
    estimated_hours: parent.estimated_hours,
    due_date: date.toISOString().slice(0, 10),
    scheduled_start: parent.scheduled_start,
    created_by: parent.created_by,
    assigned_to: parent.assigned_to,
    status: 'open',
    customer_name: parent.customer_name,
    customer_phone: parent.customer_phone,
    customer_email: parent.customer_email,
    customer_address: parent.customer_address,
    recurrence: 'none',
    recurrence_parent_id: parent.id,
  }))

  const { error } = await supabase.from('jobs').insert(rows)
  if (error) throw error
  return rows.length
}

// ── Conflict detection ─────────────────────────────────────────────────────

export interface ScheduleConflict {
  type: 'overbooked' | 'double_booked'
  userId: string
  date: string // YYYY-MM-DD
  jobIds: string[]
  message: string
}

function dateKey(value: string): string {
  return value.slice(0, 10)
}

/**
 * Detects scheduling conflicts across a set of jobs:
 *  - double_booked: two jobs for the same tech starting at the same time on the same day
 *  - overbooked: a tech's estimated hours for one day exceed the working-day capacity
 */
export function detectConflicts(jobs: Job[], tenant: Tenant | null): ScheduleConflict[] {
  const hours = getWorkHours(tenant)
  const capacity = dailyCapacityHours(hours)
  const conflicts: ScheduleConflict[] = []

  const byUserDay = new Map<string, Job[]>()
  for (const job of jobs) {
    if (!job.assigned_to || !job.due_date || job.status === 'cancelled' || job.status === 'completed') continue
    const key = `${job.assigned_to}|${dateKey(job.due_date)}`
    const list = byUserDay.get(key) ?? []
    list.push(job)
    byUserDay.set(key, list)
  }

  for (const [key, dayJobs] of byUserDay) {
    const [userId, date] = key.split('|')

    // Same start time
    const byStart = new Map<string, Job[]>()
    for (const job of dayJobs) {
      if (!job.scheduled_start) continue
      const list = byStart.get(job.scheduled_start) ?? []
      list.push(job)
      byStart.set(job.scheduled_start, list)
    }
    for (const [start, group] of byStart) {
      if (group.length > 1) {
        conflicts.push({
          type: 'double_booked',
          userId,
          date,
          jobIds: group.map((j) => j.id),
          message: `${group.length} jobs booked at ${start.slice(0, 5)} on ${date}`,
        })
      }
    }

    // Capacity
    const totalHours = dayJobs.reduce((sum, j) => sum + (j.estimated_hours ?? 0), 0)
    if (capacity > 0 && totalHours > capacity) {
      conflicts.push({
        type: 'overbooked',
        userId,
        date,
        jobIds: dayJobs.map((j) => j.id),
        message: `${totalHours}h booked on ${date} — capacity is ${capacity.toFixed(1)}h`,
      })
    }
  }

  return conflicts
}

// ── Skills-based crew suggestions ──────────────────────────────────────────

export type MemberWithProfile = TenantMember & { profiles: Profile }

/**
 * Scores a member against a job by matching their skill tags against the job
 * title + description. Higher = better match.
 */
export function scoreMemberForJob(job: Job, member: MemberWithProfile): number {
  const haystack = `${job.title} ${job.description ?? ''}`.toLowerCase()
  let score = 0
  for (const skill of member.skills ?? []) {
    const needle = skill.trim().toLowerCase()
    if (needle && haystack.includes(needle)) score += 1
  }
  return score
}

/** Members sorted best-match first; ties keep original order. */
export function rankMembersForJob(job: Job, members: MemberWithProfile[]): (MemberWithProfile & { matchScore: number })[] {
  return members
    .map((m) => ({ ...m, matchScore: scoreMemberForJob(job, m) }))
    .sort((a, b) => b.matchScore - a.matchScore)
}

export async function updateMemberSkills(memberId: string, skills: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_members')
    .update({ skills })
    .eq('id', memberId)
  if (error) throw error
}
