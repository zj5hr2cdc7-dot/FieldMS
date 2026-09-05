'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { getJobs, createJob, updateJob, assignJobToUser, unassignJob } from '@/lib/jobs'
import { getTenantMembers } from '@/lib/auth'
import { createRecurringOccurrences } from '@/lib/schedule'
import { updateJobStatusOfflineAware } from '@/lib/offline-queue'
import { autoGenerateFormsForJob } from '@/lib/forms'
import TechnicianControls from '@/components/TechnicianControls'
import type { Job, JobStatus, JobPriority, JobRecurrence, TenantMember, Profile } from '@/types/database'

type Filter = 'all' | JobStatus

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

const STATUS_NEXT: Partial<Record<JobStatus, { label: string; next: JobStatus }>> = {
  open: { label: 'Start', next: 'in_progress' },
  in_progress: { label: 'Complete', next: 'completed' },
}

const STATUS_COLORS: Record<JobStatus, string> = {
  open: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const PRIORITY_COLORS: Record<JobPriority, string> = {
  low: 'bg-slate-100 text-slate-500',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400'

export default function JobsPage() {
  const { currentTenant, session } = useAuthContext()
  const [jobs, setJobs] = useState<Job[]>([])
  const [members, setMembers] = useState<(TenantMember & { profiles: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [advancingId, setAdvancingId] = useState<string | null>(null)
  const [trackingLinks, setTrackingLinks] = useState<Record<string, { loading: boolean; url: string | null }>>({})

  // Create form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<JobPriority>('medium')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [recurrence, setRecurrence] = useState<JobRecurrence>('none')
  const [recurrenceUntil, setRecurrenceUntil] = useState('')

  const fetchAll = async () => {
    if (!currentTenant) return
    const [jobsData, membersData] = await Promise.all([
      getJobs(currentTenant.id).catch(() => [] as Job[]),
      getTenantMembers(currentTenant.id).catch(() => []),
    ])
    setJobs(jobsData)
    setMembers(membersData)
  }

  useEffect(() => {
    fetchAll().finally(() => setLoading(false))
  }, [currentTenant])

  const filtered = useMemo(() => {
    let list = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)
    if (search.trim()) {
      const s = search.toLowerCase()
      list = list.filter(j =>
        j.title.toLowerCase().includes(s) ||
        j.customer_name?.toLowerCase().includes(s) ||
        j.customer_address?.toLowerCase().includes(s)
      )
    }
    return list
  }, [jobs, filter, search])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: jobs.length }
    for (const s of ['open', 'in_progress', 'completed', 'cancelled']) {
      c[s] = jobs.filter(j => j.status === s).length
    }
    return c
  }, [jobs])

  const clearSuccess = () => window.setTimeout(() => setSuccess(''), 3000)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentTenant || !session?.user) return
    try {
      const created = await createJob(currentTenant.id, session.user.id, {
        title, description: description || undefined, priority,
        estimated_hours: estimatedHours ? parseInt(estimatedHours) : undefined,
        due_date: dueDate || undefined, assigned_to: assignedTo || undefined,
        customer_name: customerName || undefined, customer_phone: customerPhone || undefined,
        customer_email: customerEmail || undefined, customer_address: customerAddress || undefined,
        recurrence, recurrence_until: recurrenceUntil || undefined,
      })
      let occurrences = 0
      if (recurrence !== 'none' && recurrenceUntil && dueDate) {
        occurrences = await createRecurringOccurrences(created, currentTenant)
      }
      setTitle(''); setDescription(''); setPriority('medium'); setEstimatedHours('')
      setDueDate(''); setAssignedTo(''); setCustomerName(''); setCustomerPhone('')
      setCustomerEmail(''); setCustomerAddress(''); setShowCreate(false); setShowAdvanced(false)
      setRecurrence('none'); setRecurrenceUntil('')
      setSuccess(occurrences > 0 ? `Job created with ${occurrences} recurring visit(s) on working days.` : 'Job created.'); clearSuccess()
      fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
    }
  }

  const handleAdvance = async (job: Job) => {
    const advance = STATUS_NEXT[job.status]
    if (!advance) return
    setAdvancingId(job.id)
    try {
      const { queued } = await updateJobStatusOfflineAware(job.id, advance.next)
      if (queued) {
        // Optimistic local update — will sync when back online
        setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: advance.next } : j)))
        window.dispatchEvent(new Event('fieldms-queued'))
        setSuccess(`Saved offline — "${advance.next.replace('_', ' ')}" will sync when you're back in range.`); clearSuccess()
      } else {
        // Automation: when a job completes, auto-create any templates flagged
        // "auto on job completion" (compliance certs, completion sign-offs, …)
        let autoMsg = ''
        if (advance.next === 'completed' && currentTenant && session?.user) {
          try {
            const created = await autoGenerateFormsForJob(job, currentTenant.id, session.user.id, {
              tenant: currentTenant,
              technicianName: session.profile?.full_name ?? null,
              technicianEmail: session.user.email ?? null,
            })
            if (created > 0) autoMsg = ` ${created} compliance form(s) auto-created — see Forms.`
          } catch { /* non-fatal */ }
        }
        setSuccess(`Job marked as ${advance.next.replace('_', ' ')}.${autoMsg}`); clearSuccess()
        fetchAll()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setAdvancingId(null)
    }
  }

  const handleStatusChange = async (jobId: string, status: JobStatus) => {
    try {
      await updateJob(jobId, { status })
      fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const handleAssign = async (jobId: string, userId: string) => {
    try {
      await assignJobToUser(jobId, userId)
      setSuccess('Assigned.'); clearSuccess()
      fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to assign')
    }
  }

  const handleUnassign = async (jobId: string) => {
    try {
      await unassignJob(jobId)
      fetchAll()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to unassign')
    }
  }

  const handleGetTracking = async (jobId: string) => {
    setTrackingLinks(p => ({ ...p, [jobId]: { loading: true, url: null } }))
    try {
      const res = await fetch(`/api/jobs/${jobId}/token`, { method: 'POST' })
      const json = await res.json()
      setTrackingLinks(p => ({ ...p, [jobId]: { loading: false, url: json.trackingUrl } }))
    } catch {
      setTrackingLinks(p => ({ ...p, [jobId]: { loading: false, url: null } }))
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex h-64 items-center justify-center">
        <div className="text-slate-400">Loading jobs…</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">{jobs.length} total · {counts.in_progress || 0} in progress</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setShowAdvanced(false) }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New job
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">New job</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Job title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Switchboard upgrade — 123 Main St" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value as JobPriority)} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Assign to</label>
                <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className={inputCls}>
                  <option value="">Unassigned</option>
                  {members.map(m => (
                    <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Customer name</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Customer phone</label>
                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="04xx xxx xxx" className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Site address</label>
                <input value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="123 Main St, Sydney NSW 2000" className={inputCls} />
              </div>
            </div>

            {/* Advanced toggle */}
            <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
              {showAdvanced ? 'Hide' : 'More options'} (description, hours, due date, email)
            </button>

            {showAdvanced && (
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Job details…" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Estimated hours</label>
                  <input type="number" value={estimatedHours} onChange={e => setEstimatedHours(e.target.value)} min="0" placeholder="Hours" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Due date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Customer email</label>
                  <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@example.com" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Repeats</label>
                  <select value={recurrence} onChange={e => setRecurrence(e.target.value as JobRecurrence)} className={inputCls}>
                    <option value="none">Doesn&apos;t repeat</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  {recurrence !== 'none' && (
                    <p className="mt-1 text-xs text-slate-400">Occurrences land on working days only — never on a weekend by accident.</p>
                  )}
                </div>
                {recurrence !== 'none' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Repeat until</label>
                    <input type="date" value={recurrenceUntil} onChange={e => setRecurrenceUntil(e.target.value)} className={inputCls} />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="submit" className="rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors">
                Create job
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-ink text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${filter === f.key ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {counts[f.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search jobs…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 sm:w-56"
        />
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <h3 className="font-semibold text-slate-700">{search ? 'No jobs match that search' : `No ${filter === 'all' ? '' : filter.replace('_', ' ')} jobs`}</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const assignedMember = members.find(m => m.user_id === job.assigned_to)
            const isMe = job.assigned_to === session?.user?.id
            const tracking = trackingLinks[job.id]
            const advance = STATUS_NEXT[job.status]
            const isExpanded = expandedId === job.id

            return (
              <div key={job.id} className="rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow">
                {/* Main row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[job.status]}`}>
                        {job.status.replace('_', ' ')}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PRIORITY_COLORS[job.priority]}`}>
                        {job.priority}
                      </span>
                      {job.estimated_hours && <span className="text-xs text-slate-400">{job.estimated_hours}h</span>}
                      {job.due_date && <span className="text-xs text-slate-400">Due {new Date(job.due_date).toLocaleDateString('en-AU')}</span>}
                    </div>
                    <h3 className="font-semibold text-slate-900 truncate">{job.title}</h3>
                    {(job.customer_name || job.customer_address) && (
                      <p className="text-sm text-slate-500 mt-0.5 truncate">
                        {[job.customer_name, job.customer_address].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Right-side actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Quick links */}
                    <Link href={`/dashboard/jobs/${job.id}/billing`} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-light transition-colors">
                      Billing
                    </Link>
                    <Link href={`/dashboard/billing?job=${job.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                      Quote
                    </Link>
                    <Link href={`/dashboard/forms?job=${job.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                      Forms
                    </Link>

                    {/* One-tap status advance */}
                    {advance && (
                      <button
                        onClick={() => handleAdvance(job)}
                        disabled={advancingId === job.id}
                        className="rounded-lg bg-brand hover:bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                      >
                        {advancingId === job.id ? '…' : advance.label}
                      </button>
                    )}

                    {/* Status dropdown for full control */}
                    <select
                      value={job.status}
                      onChange={e => handleStatusChange(job.id, e.target.value as JobStatus)}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">

                    {/* Description */}
                    {job.description && (
                      <p className="text-sm text-slate-600 whitespace-pre-line">{job.description}</p>
                    )}

                    {/* Customer details */}
                    {(job.customer_phone || job.customer_email) && (
                      <div className="flex flex-wrap gap-4 text-sm">
                        {job.customer_phone && (
                          <a href={`tel:${job.customer_phone}`} className="flex items-center gap-1.5 text-brand-dark hover:text-brand">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {job.customer_phone}
                          </a>
                        )}
                        {job.customer_email && (
                          <a href={`mailto:${job.customer_email}`} className="flex items-center gap-1.5 text-brand-dark hover:text-brand">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>
                            {job.customer_email}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Assignment */}
                    <div className="flex flex-wrap items-center gap-3">
                      {job.assigned_to ? (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400">Assigned to</span>
                          <span className="font-medium text-slate-700">{assignedMember?.profiles?.full_name || assignedMember?.profiles?.email || 'Unknown'}</span>
                          <button onClick={() => handleUnassign(job.id)} className="text-xs text-red-500 hover:text-red-600">Unassign</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-400">Unassigned</span>
                          <select
                            defaultValue=""
                            onChange={e => { if (e.target.value) { handleAssign(job.id, e.target.value); e.target.value = '' } }}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 outline-none focus:border-brand"
                          >
                            <option value="">Assign to…</option>
                            {members.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name || m.profiles?.email}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Tracking link */}
                    {job.status !== 'cancelled' && (
                      <div>
                        {tracking?.url ? (
                          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{tracking.url}</p>
                            <button
                              onClick={() => navigator.clipboard?.writeText(tracking.url!)}
                              className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Copy
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGetTracking(job.id)}
                            disabled={tracking?.loading}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {tracking?.loading ? 'Generating…' : 'Get tracking link'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Technician controls */}
                    {isMe && job.status !== 'cancelled' && <TechnicianControls jobId={job.id} />}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
