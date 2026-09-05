'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getJobs } from '@/lib/jobs'
import NoJobsYet from '@/components/NoJobsYet'
import {
  getPhotosForJob,
  uploadJobPhoto,
  updatePhotoCaption,
  deleteJobPhoto,
  getPhotoSignedUrl,
  createJobReport,
  sendReportToCustomer,
  reportUrl,
} from '@/lib/photos'
import type { Job, JobPhoto, JobReport } from '@/types/database'

interface PhotoWithUrl extends JobPhoto {
  url: string | null
  selected: boolean
}

export default function SiteReportsPage() {
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [photos, setPhotos] = useState<PhotoWithUrl[]>([])
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('Site report')
  const [summary, setSummary] = useState('')
  const [creating, setCreating] = useState(false)
  const [report, setReport] = useState<JobReport | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    getJobs(currentTenant.id)
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setJobsLoaded(true))
  }, [currentTenant])

  useEffect(() => {
    if (!selectedJobId) { setPhotos([]); setReport(null); return }
    setReport(null)
    getPhotosForJob(selectedJobId)
      .then(async (rows) => {
        const withUrls = await Promise.all(
          rows.map(async (p) => ({ ...p, url: await getPhotoSignedUrl(p.file_path), selected: true }))
        )
        setPhotos(withUrls)
      })
      .catch((err) => setError(err.message))
  }, [selectedJobId])

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null

  const handleUpload = async (files: FileList | null) => {
    if (!files || !currentTenant || !user || !selectedJobId) return
    setUploading(true)
    setError(null)
    try {
      for (const file of Array.from(files)) {
        const photo = await uploadJobPhoto(currentTenant.id, selectedJobId, user.id, file)
        const url = await getPhotoSignedUrl(photo.file_path)
        setPhotos((prev) => [...prev, { ...photo, url, selected: true }])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const handleCreateReport = async () => {
    if (!currentTenant || !user || !selectedJobId) return
    const photoIds = photos.filter((p) => p.selected).map((p) => p.id)
    if (photoIds.length === 0) { setError('Select at least one photo for the report.'); return }
    setCreating(true)
    setError(null)
    try {
      const created = await createJobReport({
        tenantId: currentTenant.id,
        jobId: selectedJobId,
        userId: user.id,
        title,
        summary,
        photoIds,
      })
      setReport(created)
      setSuccess('Report created. Share the link or send it to the customer.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create report.')
    } finally {
      setCreating(false)
    }
  }

  const handleSend = async () => {
    if (!report) return
    setSending(true)
    setError(null)
    const result = await sendReportToCustomer(report.id)
    if (result.ok) {
      setSuccess('Report sent to the customer by SMS/email.')
    } else {
      setError(result.error || 'Failed to send.')
    }
    setSending(false)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Site reports</h1>
        <p className="text-slate-500 mt-1">
          Photo reports your customers can open, keep, and print — branded with your business, not ours.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {jobsLoaded && jobs.length === 0 ? (
        <NoJobsYet
          thing="site report"
          why="Photos and site reports are captured against a job, so the customer gets a report they recognise."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">Job</label>
          <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className={inputCls} disabled={!jobsLoaded}>
            <option value="">Select a job…</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}{job.customer_name ? ` — ${job.customer_name}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedJobId && (
        <>
          {/* Photos */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Job photos</h2>
              <label className="cursor-pointer rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
                {uploading ? 'Uploading…' : '+ Add photos'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
              </label>
            </div>

            {photos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
                No photos yet. Upload straight from your phone on site.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((photo) => (
                  <div key={photo.id} className={`rounded-lg border p-3 ${photo.selected ? 'border-brand bg-green-50/30' : 'border-slate-200 bg-white'}`}>
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt={photo.caption || 'Job photo'} className="h-40 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="h-40 w-full rounded-lg bg-slate-100" />
                    )}
                    <input
                      value={photo.caption ?? ''}
                      placeholder="Caption (e.g. Switchboard before)"
                      onChange={(e) => setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: e.target.value } : p)))}
                      onBlur={(e) => updatePhotoCaption(photo.id, e.target.value).catch(() => {})}
                      className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-brand"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={photo.selected}
                          onChange={() => setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, selected: !p.selected } : p)))}
                          className="accent-brand"
                        />
                        Include in report
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          deleteJobPhoto(photo).catch(() => {})
                          setPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                        }}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report builder */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Build report</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Report title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Summary of work</label>
                <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className={inputCls} placeholder="What was found, what was done, any recommendations…" />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCreateReport}
                disabled={creating || photos.filter((p) => p.selected).length === 0}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : `Create report (${photos.filter((p) => p.selected).length} photos)`}
              </button>

              {report && (
                <>
                  <a href={reportUrl(report)} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-center">
                    Preview
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(reportUrl(report))
                      setSuccess('Report link copied.')
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || (!selectedJob?.customer_phone && !selectedJob?.customer_email)}
                    className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light transition-colors disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send to customer'}
                  </button>
                </>
              )}
            </div>
            {report && !selectedJob?.customer_phone && !selectedJob?.customer_email && (
              <p className="mt-2 text-xs text-slate-400">Add a customer phone or email to the job to send directly.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
