/**
 * Offline write queue.
 *
 * Switchrooms, basements and rural sites have no signal. Field updates are
 * applied straight away when online; when the device is offline, or the
 * request fails because the connection dropped, they are stored on the
 * device and replayed in order when the connection returns
 * (components/OfflineSync.tsx).
 *
 * Queued today:
 *   job_status       job status changes            (last write wins per job)
 *   form_save        form field values             (last write wins per form)
 *   form_signature   a signature on a form         (one per form and role)
 *   test_sheet_save  test sheet details + circuits (last write wins per sheet)
 *   photo_upload     a job photo; the file itself waits in IndexedDB
 *
 * NOT queued, on purpose: completing a form, issuing a test certificate and
 * anything that creates a number or sends something. Those need the server
 * to say yes at the time, so they stay online-only and say so.
 */

import { createClient } from '@/utils/supabase/client'
import type { JobStatus } from '@/types/database'
import { putBlob, getBlob, deleteBlob } from '@/lib/offline-blobs'
import { logAudit } from '@/lib/forms'

const QUEUE_KEY = 'fieldms-offline-queue'

type Base = { id: string; queuedAt: string }

export type QueuedAction =
  | (Base & { type: 'job_status'; jobId: string; status: JobStatus })
  | (Base & { type: 'form_save'; submissionId: string; data: Record<string, unknown> })
  | (Base & {
      type: 'form_signature'
      submissionId: string
      tenantId: string
      role: string
      signerName: string
      signatureData: string
    })
  | (Base & { type: 'test_sheet_save'; sheetId: string; updates: Record<string, unknown> })
  | (Base & {
      type: 'photo_upload'
      tenantId: string
      jobId: string
      userId: string
      fileName: string
      contentType: string
      caption: string | null
      blobKey: string
    })

type NewAction = QueuedAction extends infer A ? (A extends QueuedAction ? Omit<A, 'id' | 'queuedAt'> : never) : never

function readQueue(): QueuedAction[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as QueuedAction[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedAction[]): boolean {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    return true
  } catch {
    return false
  }
}

export function pendingCount(): number {
  return readQueue().length
}

export function pendingActions(): QueuedAction[] {
  return readQueue()
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/** Was this failure the network rather than the server saying no? */
function isNetworkFailure(err: unknown): boolean {
  if (!isOnline()) return true
  const msg = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err)
  return /failed to fetch|network|load failed|fetch failed|timed? ?out/i.test(msg)
}

/** Which earlier queued action does this one replace, if any? */
function supersedes(a: QueuedAction, b: NewAction): boolean {
  if (a.type !== b.type) return false
  switch (b.type) {
    case 'job_status':
      return (a as typeof b).jobId === b.jobId
    case 'form_save':
      return (a as typeof b).submissionId === b.submissionId
    case 'form_signature':
      return (a as typeof b).submissionId === b.submissionId && (a as typeof b).role === b.role
    case 'test_sheet_save':
      return (a as typeof b).sheetId === b.sheetId
    default:
      return false
  }
}

function enqueue(action: NewAction): void {
  const queue = readQueue().filter((a) => !supersedes(a, action))
  queue.push({ ...action, id: crypto.randomUUID(), queuedAt: new Date().toISOString() } as QueuedAction)
  if (!writeQueue(queue)) {
    throw new Error('This device is out of storage, so the change could not be saved offline.')
  }
  window.dispatchEvent(new Event('fieldms-queued'))
}

/**
 * Run `online` now if we can; if we are offline or the connection drops
 * mid-request, queue `action` instead. Errors from the server (permissions,
 * validation) are still thrown, because retrying them later would not help.
 */
async function runOrQueue<T>(action: NewAction, online: () => Promise<T>): Promise<{ queued: true } | { queued: false; result: T }> {
  if (!isOnline()) {
    enqueue(action)
    return { queued: true }
  }
  try {
    return { queued: false, result: await online() }
  } catch (err) {
    if (isNetworkFailure(err)) {
      enqueue(action)
      return { queued: true }
    }
    throw err
  }
}

// ── Public, offline-aware writes ───────────────────────────────────────────

async function applyJobStatus(jobId: string, status: JobStatus) {
  const { error } = await createClient().from('jobs').update({ status }).eq('id', jobId)
  if (error) throw error
}

export async function updateJobStatusOfflineAware(jobId: string, status: JobStatus): Promise<{ queued: boolean }> {
  const r = await runOrQueue({ type: 'job_status', jobId, status }, () => applyJobStatus(jobId, status))
  return { queued: r.queued }
}

async function applyFormSave(submissionId: string, data: Record<string, unknown>) {
  const { error } = await createClient().from('form_submissions').update({ data }).eq('id', submissionId)
  if (error) throw error
}

export async function saveFormOfflineAware(submissionId: string, data: Record<string, unknown>): Promise<{ queued: boolean }> {
  const r = await runOrQueue({ type: 'form_save', submissionId, data }, () => applyFormSave(submissionId, data))
  return { queued: r.queued }
}

async function applySignature(a: { submissionId: string; tenantId: string; role: string; signerName: string; signatureData: string }) {
  const supabase = createClient()
  const { error } = await supabase.from('form_signatures').upsert(
    {
      submission_id: a.submissionId,
      tenant_id: a.tenantId,
      role: a.role,
      signer_name: a.signerName,
      signature_data: a.signatureData,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    },
    { onConflict: 'submission_id,role' }
  )
  if (error) throw error
  await logAudit(a.submissionId, a.tenantId, 'signed', a.signerName, { role: a.role })
}

export async function addSignatureOfflineAware(a: {
  submissionId: string
  tenantId: string
  role: string
  signerName: string
  signatureData: string
}): Promise<{ queued: boolean }> {
  const r = await runOrQueue({ type: 'form_signature', ...a }, () => applySignature(a))
  return { queued: r.queued }
}

async function applyTestSheet(sheetId: string, updates: Record<string, unknown>) {
  const { error } = await createClient().from('job_test_sheets').update(updates).eq('id', sheetId)
  if (error) throw error
}

export async function saveTestSheetOfflineAware(sheetId: string, updates: Record<string, unknown>): Promise<{ queued: boolean }> {
  const r = await runOrQueue({ type: 'test_sheet_save', sheetId, updates }, () => applyTestSheet(sheetId, updates))
  return { queued: r.queued }
}

async function applyPhoto(a: {
  tenantId: string
  jobId: string
  userId: string
  fileName: string
  contentType: string
  caption: string | null
  blob: Blob
}) {
  const supabase = createClient()
  const ext = a.fileName.split('.').pop() || 'jpg'
  const path = `${a.tenantId}/${a.jobId}/${Date.now()}_${crypto.randomUUID()}.${ext}`
  const { error: storageError } = await supabase.storage
    .from('job-photos')
    .upload(path, a.blob, { contentType: a.contentType, upsert: false })
  if (storageError) throw storageError
  const { error } = await supabase.from('job_photos').insert({
    tenant_id: a.tenantId,
    job_id: a.jobId,
    file_path: path,
    caption: a.caption,
    uploaded_by: a.userId,
  })
  if (error) throw error
}

/**
 * Upload a photo, or keep it on the device until there is signal.
 * Returns { queued: true } when the photo is waiting to upload.
 */
export async function uploadPhotoOfflineAware(a: {
  tenantId: string
  jobId: string
  userId: string
  file: File
  caption?: string | null
}): Promise<{ queued: boolean }> {
  const meta = {
    tenantId: a.tenantId,
    jobId: a.jobId,
    userId: a.userId,
    fileName: a.file.name || 'photo.jpg',
    contentType: a.file.type || 'image/jpeg',
    caption: a.caption ?? null,
  }
  const queue = async () => {
    const blobKey = crypto.randomUUID()
    await putBlob(blobKey, a.file)
    enqueue({ type: 'photo_upload', ...meta, blobKey })
    return { queued: true as const }
  }
  if (!isOnline()) return queue()
  try {
    await applyPhoto({ ...meta, blob: a.file })
    return { queued: false }
  } catch (err) {
    if (isNetworkFailure(err)) return queue()
    throw err
  }
}

/** Photos for a job that are still waiting on this device, for previews. */
export async function pendingPhotosForJob(jobId: string): Promise<{ id: string; url: string; caption: string | null }[]> {
  const items = readQueue().filter((a): a is Extract<QueuedAction, { type: 'photo_upload' }> => a.type === 'photo_upload' && a.jobId === jobId)
  const out: { id: string; url: string; caption: string | null }[] = []
  for (const item of items) {
    const blob = await getBlob(item.blobKey).catch(() => undefined)
    if (blob) out.push({ id: item.id, url: URL.createObjectURL(blob), caption: item.caption })
  }
  return out
}

// ── Replay ─────────────────────────────────────────────────────────────────

/**
 * Replays queued actions in the order they were made. Called on the
 * 'online' event and on app start. Stops at the first network failure (no
 * point hammering a dead connection) and keeps everything not yet sent.
 * An action the server REJECTS is dropped and reported, so one bad change
 * cannot block every later one forever.
 */
export async function flushQueue(): Promise<{ synced: number; failed: string[] }> {
  const queue = readQueue()
  if (queue.length === 0) return { synced: 0, failed: [] }

  const done = new Set<string>()
  const failed: string[] = []
  let synced = 0

  for (const action of queue) {
    try {
      switch (action.type) {
        case 'job_status':
          await applyJobStatus(action.jobId, action.status)
          break
        case 'form_save':
          await applyFormSave(action.submissionId, action.data)
          break
        case 'form_signature':
          await applySignature(action)
          break
        case 'test_sheet_save':
          await applyTestSheet(action.sheetId, action.updates)
          break
        case 'photo_upload': {
          const blob = await getBlob(action.blobKey)
          if (blob) await applyPhoto({ ...action, blob })
          await deleteBlob(action.blobKey).catch(() => {})
          break
        }
      }
      done.add(action.id)
      synced += 1
    } catch (err) {
      if (isNetworkFailure(err)) break
      done.add(action.id)
      failed.push(describe(action))
    }
  }

  // Re-read: new actions may have been queued while this ran.
  writeQueue(readQueue().filter((a) => !done.has(a.id)))
  return { synced, failed }
}

function describe(a: QueuedAction): string {
  switch (a.type) {
    case 'job_status':
      return 'a job status change'
    case 'form_save':
      return 'form answers'
    case 'form_signature':
      return `a signature from ${a.signerName}`
    case 'test_sheet_save':
      return 'test sheet changes'
    case 'photo_upload':
      return 'a photo'
  }
}
