'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getMyJobs } from '@/lib/field'
import { getPhotosForJob, uploadJobPhoto, updatePhotoCaption, getPhotoSignedUrl } from '@/lib/photos'
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

  useEffect(() => { if (userId) getMyJobs(userId).then(setJobs).catch(() => {}) }, [userId])

  const loadPhotos = useCallback(async (id: string) => {
    if (!id) { setPhotos([]); return }
    const rows = await getPhotosForJob(id)
    const withUrls = await Promise.all(rows.map(async (p) => ({ ...p, url: await getPhotoSignedUrl(p.file_path) })))
    setPhotos(withUrls)
  }, [])

  useEffect(() => { loadPhotos(jobId).catch(() => {}) }, [jobId, loadPhotos])

  const upload = async (files: FileList | null) => {
    if (!files || !currentTenant || !userId || !jobId) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadJobPhoto(currentTenant.id, jobId, userId, file)
        const url = await getPhotoSignedUrl(photo.file_path)
        setPhotos((prev) => [...prev, { ...photo, url }])
      }
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

          {photos.length === 0 ? (
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
