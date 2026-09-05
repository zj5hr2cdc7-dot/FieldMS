/**
 * Offline write queue.
 *
 * Competitors' offline modes are read-only (Jobber: "can't create jobs,
 * process payments, or sync updates until you're back online"). FieldMS
 * queues field updates locally and replays them when the connection returns,
 * so a tech in a switchroom can still advance jobs.
 */

import { createClient } from '@/utils/supabase/client'
import type { JobStatus } from '@/types/database'

const QUEUE_KEY = 'fieldms-offline-queue'

export interface QueuedAction {
  id: string
  type: 'job_status'
  jobId: string
  status: JobStatus
  queuedAt: string
}

function readQueue(): QueuedAction[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedAction[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch {
    /* storage full — drop silently rather than crash in the field */
  }
}

export function pendingCount(): number {
  return readQueue().length
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/**
 * Updates a job's status, or queues the update if offline.
 * Returns { queued: true } when stored for later sync.
 */
export async function updateJobStatusOfflineAware(
  jobId: string,
  status: JobStatus
): Promise<{ queued: boolean }> {
  if (isOnline()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('jobs').update({ status }).eq('id', jobId)
      if (error) throw error
      return { queued: false }
    } catch (err) {
      // Network flaked mid-request — fall through to the queue
      if (!isOnline()) {
        enqueue(jobId, status)
        return { queued: true }
      }
      throw err
    }
  }
  enqueue(jobId, status)
  return { queued: true }
}

function enqueue(jobId: string, status: JobStatus) {
  const queue = readQueue()
  // Last write wins per job — replace any earlier queued status for this job
  const filtered = queue.filter((a) => !(a.type === 'job_status' && a.jobId === jobId))
  filtered.push({
    id: crypto.randomUUID(),
    type: 'job_status',
    jobId,
    status,
    queuedAt: new Date().toISOString(),
  })
  writeQueue(filtered)
}

/**
 * Replays queued actions. Called on the 'online' event and on app start.
 * Returns the number of successfully synced actions.
 */
export async function flushQueue(): Promise<number> {
  const queue = readQueue()
  if (queue.length === 0) return 0

  const supabase = createClient()
  const remaining: QueuedAction[] = []
  let synced = 0

  for (const action of queue) {
    try {
      if (action.type === 'job_status') {
        const { error } = await supabase.from('jobs').update({ status: action.status }).eq('id', action.jobId)
        if (error) throw error
      }
      synced += 1
    } catch {
      remaining.push(action) // keep for next flush
    }
  }

  writeQueue(remaining)
  return synced
}
