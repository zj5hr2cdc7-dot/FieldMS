'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getMyJobs } from '@/lib/field'
import { getPhotosForJob, updatePhotoCaption, getPhotoSignedUrl } from '@/lib/photos'
import { uploadPhotoOfflineAware, pendingPhotosForJob } from '@/lib/offline-queue'
import type { Job, JobPhoto } from '@/types/database'

interface PhotoUrl extends JobPhoto { url: string | null }

function PhotosInner() {
  const params = useSearchParams()
  const { currentTenant, session } = useAuthContext()
  const userId = session?.user?.id
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobId, setJobId] = useState(params.get('job') ?? '')
  const [photos, setPhotos] = useState<PhotoUrl[]>([])
  const [uploading, setUploading] = useState(false)
  const [waiting, setWaiting] = useState<{ id: string; url: string; caption: string | null }[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (userId) getMyJobs(userId).then(setJobs).catch(() => {}) }, [userId])

  const loadPhotos = useCallback(async (id: string) => {
    if (!id) { setPhotos([]); setWaiting([]); return }
    // Photos still waiting on this device show first, even with no signal.
    setWaiting(await pendingPhotosForJob(id).catch(() => []))
    const rows = await getPhotosForJob(id)
    const withUrls = await Promise.all(rows.map(async (p) => ({ ...p, url: await getPhotoSignedUrl(p.file_path) })))
    setPhotos(withUrls)
  }, [])

  // When queued photos finish uploading, refresh the list.
  useEffect(() => {
    const refresh = () => { loadPhotos(jobId).catch(() => {}) }
    window.addEventListener('online', refresh)
    window.addEventListener('fieldms-synced', refresh)
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('fieldms-synced', refresh) }
  }, [jobId, loadPhotos])

  useEffect(() => { loadPhotos(jobId).catch(() => {}) }, [jobId, loadPhotos])

  const upload = async (files: FileList | null) => {
    if (!files || !currentTenant || !userId || !jobId) return
    setUploading(true)
    setError(null)
    try {
      let anyQueued = false
      for (const file of Array.from(files)) {
        const { queued } = await uploadPhotoOfflineAware({ tenantId: currentTenant.id, jobId, userId, file })
        if (queued) anyQueued = true
      }
      if (anyQueued) setWaiting(await pendingPhotosForJob(jobId).catch(() => []))
      await loadPhotos(jobId).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the photo')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Photos</h1>

      <select value={jobId} onChange={(e) => setJobId(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand">
        <option value="">Select a job…</option>
        {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.customer_name ? ` — ${j.customer_name}` : ''}</option>)}
      </select>

      {jobId && (
        <>
          <label className="flex items-center justify-center gap-2 rounded-xl bg-brand py-4 text-base font-bold text-white active:bg-brand-dark">
            {uploading ? 'Uploading…' : '📷 Take / add photos'}
            <input type="file" accept="image/*" capture="environment" multiple className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
          </label>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          {waiting.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Saved on this phone, uploads when you have signal</p>
              <div className="grid grid-cols-2 gap-3">
                {waiting.map((p) => (
                  <div key={p.id} className="relative rounded-xl border border-amber-200 bg-amber-50 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="Photo waiting to upload" className="h-32 w-full rounded-lg object-cover opacity-80" />
                    <span className="absolute left-3 top-3 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">WAITING</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {photos.length === 0 && waiting.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No photos yet for this job.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-2">
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={p.caption ?? 'Job photo'} className="h-32 w-full rounded-lg object-cover" />
                  ) : <div className="h-32 w-full rounded-lg bg-slate-100" />}
                  <input
                    defaultValue={p.caption ?? ''}
                    placeholder="Caption (before/after…)"
                    onBlur={(e) => updatePhotoCaption(p.id, e.target.value).catch(() => {})}
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function FieldPhotos() {
  return <Suspense fallback={<p className="py-10 text-center text-slate-400">Loading…</p>}><PhotosInner /></Suspense>
}
