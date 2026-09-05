'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getJobs } from '@/lib/jobs'
import { getJobPlans, uploadJobPlan, assignPlanToJob, deletePlan, getPlanSignedUrl } from '@/lib/plans'
import type { Job, JobPlan } from '@/types/database'

export default function PlansPage() {
  const { currentTenant, session } = useAuthContext()
  const [plans, setPlans] = useState<JobPlan[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingAssign, setPendingAssign] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    if (!currentTenant) return
    const [plansData, jobsData] = await Promise.all([
      getJobPlans(currentTenant.id).catch(() => [] as JobPlan[]),
      getJobs(currentTenant.id).catch(() => [] as Job[]),
    ])
    setPlans(plansData)
    setJobs(jobsData)
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [currentTenant])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentTenant || !session?.user) return
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      await uploadJobPlan(currentTenant.id, session.user.id, file)
      setSuccess(`"${file.name}" uploaded successfully.`)
      await fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAssign = async (planId: string) => {
    const jobId = pendingAssign[planId] ?? null
    setError('')
    try {
      await assignPlanToJob(planId, jobId || null)
      setSuccess('Plan assigned.')
      setPendingAssign((prev) => { const n = { ...prev }; delete n[planId]; return n })
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign plan')
    }
  }

  const handleView = async (filePath: string) => {
    setError('')
    const url = await getPlanSignedUrl(filePath).catch(() => null)
    if (url) window.open(url, '_blank')
    else setError('Could not generate view link. Check Supabase Storage is configured.')
  }

  const handleDelete = async (plan: JobPlan) => {
    if (!window.confirm(`Delete "${plan.name}"? This cannot be undone.`)) return
    setError('')
    try {
      await deletePlan(plan.id, plan.file_path)
      setSuccess('Plan deleted.')
      await fetchData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const fileIcon = (type: string | null) => {
    if (type === 'application/pdf') {
      return (
        <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
      )
    }
    if (type?.startsWith('image/')) {
      return (
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/>
            <path d="m21 15-5-5L5 21"/>
          </svg>
        </div>
      )
    }
    return (
      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex h-64 items-center justify-center">
        <div className="text-slate-400">Loading plans…</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Job Plans</h1>
          <p className="text-slate-500 mt-1 text-sm">Upload site plans, drawings, and documents then assign them to a job.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,.svg"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                Uploading…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload plan
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>
      )}

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <h3 className="text-slate-900 font-semibold">No plans uploaded yet</h3>
          <p className="text-slate-500 text-sm mt-1">Upload PDFs, images, or drawings and assign them to jobs.</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Choose file
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">{plans.length} plan{plans.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">File</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned job</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((plan) => {
                  const currentJobId = plan.job_id ?? ''
                  const selectedJobId = pendingAssign[plan.id] ?? currentJobId
                  const isDirty = pendingAssign[plan.id] !== undefined && pendingAssign[plan.id] !== currentJobId

                  return (
                    <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {fileIcon(plan.file_type)}
                          <span className="font-medium text-slate-900 truncate max-w-[180px] sm:max-w-[260px]">{plan.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{formatSize(plan.file_size)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedJobId}
                            onChange={(e) =>
                              setPendingAssign((prev) => ({ ...prev, [plan.id]: e.target.value }))
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 max-w-[160px]"
                          >
                            <option value="">Unassigned</option>
                            {jobs.map((j) => (
                              <option key={j.id} value={j.id}>{j.title}</option>
                            ))}
                          </select>
                          {isDirty && (
                            <button
                              onClick={() => handleAssign(plan.id)}
                              className="text-xs font-semibold text-brand-dark hover:text-brand whitespace-nowrap"
                            >
                              Save
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(plan.created_at).toLocaleDateString('en-AU')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleView(plan.file_path)}
                            className="text-xs font-semibold text-brand-dark hover:text-brand whitespace-nowrap"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDelete(plan)}
                            className="text-xs font-semibold text-red-500 hover:text-red-600 whitespace-nowrap"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Also show plans grouped by job */}
      {plans.some((p) => p.job_id) && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Plans by job</h2>
          <div className="space-y-4">
            {jobs.filter((j) => plans.some((p) => p.job_id === j.id)).map((job) => {
              const jobPlans = plans.filter((p) => p.job_id === job.id)
              return (
                <div key={job.id}>
                  <p className="text-sm font-medium text-slate-700 mb-2">{job.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {jobPlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handleView(plan.file_path)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        {fileIcon(plan.file_type)}
                        <span className="truncate max-w-[140px]">{plan.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
