'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import Link from 'next/link'
import { getJobs, updateJob } from '@/lib/jobs'
import GettingStarted from '@/components/GettingStarted'
import { getQuarterlyPnL } from '@/lib/billing'
import type { Job, JobStatus } from '@/types/database'
import type { QuarterlyPnL } from '@/lib/billing'

const fmt = (n: number) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

export default function DashboardPage() {
  const { currentTenant, session } = useAuthContext()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [pnl, setPnl] = useState<QuarterlyPnL[]>([])
  const [pnlLoading, setPnlLoading] = useState(true)
  const [activeQuarter, setActiveQuarter] = useState<string>('')

  const fetchJobs = () => {
    if (!currentTenant) return
    getJobs(currentTenant.id).then(setJobs).finally(() => setLoading(false))
  }

  useEffect(() => { fetchJobs() }, [currentTenant])

  useEffect(() => {
    if (!currentTenant) return
    setPnlLoading(true)
    getQuarterlyPnL(currentTenant.id)
      .then(data => {
        setPnl(data)
        if (data.length > 0) setActiveQuarter(data[0].quarter)
      })
      .finally(() => setPnlLoading(false))
  }, [currentTenant])

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const stats = useMemo(() => ({
    open: jobs.filter(j => j.status === 'open').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    dueToday: jobs.filter(j => j.due_date?.startsWith(today) && j.status !== 'completed' && j.status !== 'cancelled').length,
    completedWeek: jobs.filter(j => j.status === 'completed' && j.updated_at >= weekAgo).length,
  }), [jobs, today, weekAgo])

  const myActiveJobs = useMemo(() =>
    jobs.filter(j => j.assigned_to === session?.user?.id && j.status !== 'completed' && j.status !== 'cancelled'),
    [jobs, session])

  const otherActiveJobs = useMemo(() =>
    jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && j.assigned_to !== session?.user?.id).slice(0, 6),
    [jobs, session])

  const quickAdvance = async (job: Job) => {
    const next: JobStatus = job.status === 'open' ? 'in_progress' : 'completed'
    setUpdatingId(job.id)
    try {
      await updateJob(job.id, { status: next })
      fetchJobs()
    } finally {
      setUpdatingId(null)
    }
  }

  const greet = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const name = session?.profile?.full_name?.split(' ')[0] || 'there'
  const activeQ = pnl.find(q => q.quarter === activeQuarter)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex h-64 items-center justify-center">
        <div className="text-slate-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <GettingStarted />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{greet()}, {name}</h1>
          <p className="text-slate-500 mt-1 text-sm">Here&apos;s what&apos;s on today.</p>
        </div>
        <Link
          href="/dashboard/jobs"
          className="inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New job
        </Link>
      </div>

      {/* Job stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open', value: stats.open, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
          { label: 'Due Today', value: stats.dueToday, color: stats.dueToday > 0 ? 'text-amber-700' : 'text-slate-400', bg: stats.dueToday > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200' },
          { label: 'Done This Week', value: stats.completedWeek, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        ].map(card => (
          <Link key={card.label} href="/dashboard/jobs">
            <div className={`rounded-xl border p-5 ${card.bg} hover:shadow-sm transition-shadow cursor-pointer`}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
              <p className={`text-4xl font-bold mt-2 ${card.color}`}>{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quarterly P&L */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Profit & Loss</h2>
            <p className="text-xs text-slate-500 mt-0.5">Completed jobs with saved quotes, by quarter</p>
          </div>
          <Link href="/dashboard/billing" className="text-xs font-medium text-brand-dark hover:text-brand">
            Add quote →
          </Link>
        </div>

        {pnlLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading P&L…</div>
        ) : pnl.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-semibold text-slate-700 text-sm">No data yet</p>
            <p className="text-xs text-slate-400 mt-1">Save a quote on the billing page and mark the job complete to see P&L here.</p>
          </div>
        ) : (
          <>
            {/* Quarter tabs */}
            <div className="flex gap-1 px-4 pt-4 overflow-x-auto">
              {pnl.map(q => (
                <button
                  key={q.quarter}
                  onClick={() => setActiveQuarter(q.quarter)}
                  className={`px-4 py-2 rounded-t-lg text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeQuarter === q.quarter
                      ? 'border-brand text-brand-dark bg-brand/5'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {q.quarter}
                </button>
              ))}
            </div>

            {activeQ && (
              <div className="p-5 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(activeQ.revenue)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Labour cost</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{fmt(activeQ.cost)}</p>
                  </div>
                  <div className={`rounded-xl border p-4 ${activeQ.profit >= 0 ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profit</p>
                    <p className={`text-2xl font-bold mt-1 ${activeQ.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(activeQ.profit)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Margin</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {activeQ.revenue > 0 ? ((activeQ.profit / activeQ.revenue) * 100).toFixed(1) : '0'}%
                    </p>
                  </div>
                </div>

                {/* Per-job breakdown */}
                <div className="rounded-xl border border-slate-100 overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Job</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Revenue</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Cost</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Profit</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeQ.jobs.map(j => {
                        const margin = j.revenue > 0 ? ((j.profit / j.revenue) * 100).toFixed(1) : '0'
                        return (
                          <tr key={j.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/billing?job=${j.id}`} className="font-medium text-slate-900 hover:text-brand-dark transition-colors">
                                {j.title}
                              </Link>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Completed {new Date(j.completedAt).toLocaleDateString('en-AU')}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmt(j.revenue)}</td>
                            <td className="px-4 py-3 text-right text-slate-400">{fmt(j.cost)}</td>
                            <td className={`px-4 py-3 text-right font-semibold ${j.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                              {fmt(j.profit)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600">{margin}%</td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                      <tr>
                        <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">{activeQ.jobCount} jobs</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(activeQ.revenue)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-400">{fmt(activeQ.cost)}</td>
                        <td className={`px-4 py-3 text-right font-bold ${activeQ.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {fmt(activeQ.profit)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          {activeQ.revenue > 0 ? ((activeQ.profit / activeQ.revenue) * 100).toFixed(1) : '0'}%
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* My jobs */}
      {myActiveJobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">My active jobs</h2>
            <Link href="/dashboard/jobs" className="text-xs font-medium text-brand-dark hover:text-brand">View all →</Link>
          </div>
          <div className="space-y-3">
            {myActiveJobs.map(job => (
              <JobRow key={job.id} job={job} onAdvance={quickAdvance} advancing={updatingId === job.id} />
            ))}
          </div>
        </section>
      )}

      {/* Other active jobs */}
      {otherActiveJobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {myActiveJobs.length > 0 ? 'Other active jobs' : 'Active jobs'}
            </h2>
            <Link href="/dashboard/jobs" className="text-xs font-medium text-brand-dark hover:text-brand">View all →</Link>
          </div>
          <div className="space-y-3">
            {otherActiveJobs.map(job => (
              <JobRow key={job.id} job={job} onAdvance={quickAdvance} advancing={updatingId === job.id} />
            ))}
          </div>
        </section>
      )}

      {jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled').length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">No active jobs</h3>
          <p className="text-slate-500 text-sm mt-1">Create a job to get started.</p>
          <Link href="/dashboard/jobs" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            New job
          </Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Billing', desc: 'Build a labour quote', href: '/dashboard/billing', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
          { label: 'Compliance Forms', desc: 'CCEW, RCD test, defect notice', href: '/dashboard/forms', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8' },
          { label: 'Job Plans', desc: 'Upload and view site plans', href: '/dashboard/plans', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
        ].map(link => (
          <Link key={link.href} href={link.href} className="group rounded-xl border border-slate-200 bg-white p-5 hover:border-brand/40 hover:shadow-sm transition-all flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a9c4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {link.icon.split(' M').map((d, i) => <path key={i} d={i === 0 ? d : 'M' + d} />)}
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">{link.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 ml-auto group-hover:text-brand-dark transition-colors">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  )
}

function JobRow({ job, onAdvance, advancing }: { job: Job; onAdvance: (j: Job) => void; advancing: boolean }) {
  const nextLabel: Partial<Record<JobStatus, string>> = {
    open: 'Start job →',
    in_progress: 'Mark complete →',
  }
  const next = nextLabel[job.status]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-lg transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-900 truncate">{job.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            job.status === 'open' ? 'bg-slate-100 text-slate-600' :
            job.status === 'in_progress' ? 'bg-sky-100 text-sky-700' :
            'bg-green-100 text-green-700'
          }`}>
            {job.status.replace('_', ' ')}
          </span>
          {job.due_date && (
            <span className="text-xs text-slate-400">Due {new Date(job.due_date).toLocaleDateString('en-AU')}</span>
          )}
        </div>
        {job.customer_name && (
          <p className="text-sm text-slate-500 mt-0.5 truncate">{job.customer_name}{job.customer_address ? ` · ${job.customer_address}` : ''}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <Link href={`/dashboard/billing?job=${job.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Bill
        </Link>
        <Link href={`/dashboard/forms?job=${job.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
          Forms
        </Link>
        {next && (
          <button
            onClick={() => onAdvance(job)}
            disabled={advancing}
            className="rounded-lg bg-brand hover:bg-brand-dark px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          >
            {advancing ? '…' : next}
          </button>
        )}
      </div>
    </div>
  )
}
