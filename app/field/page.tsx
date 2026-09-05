'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { getMyJobs, getAnnouncements, isToday, type Announcement } from '@/lib/field'
import {
  getOpenEntries, getEntriesInRange, startEntry, endEntry,
  netWorkedMinutes, formatHm, startOfTodayIso, type TimeEntry, type TimeEntryKind,
} from '@/lib/time-tracking'
import type { Job } from '@/types/database'

const PRIORITY_DOT: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-amber-500', medium: 'bg-sky-500', low: 'bg-slate-400' }

export default function FieldHome() {
  const { currentTenant, session } = useAuthContext()
  const userId = session?.user?.id

  const [jobs, setJobs] = useState<Job[]>([])
  const [open, setOpen] = useState<TimeEntry[]>([])
  const [today, setToday] = useState<TimeEntry[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!currentTenant || !userId) return
    const [j, o, t, a] = await Promise.all([
      getMyJobs(userId), getOpenEntries(userId), getEntriesInRange(userId, startOfTodayIso()), getAnnouncements(currentTenant.id),
    ])
    setJobs(j); setOpen(o); setToday(t); setAnnouncements(a); setLoading(false)
  }, [currentTenant, userId])

  useEffect(() => { let a = true; (async () => { try { await refresh() } catch { if (a) setLoading(false) } })(); return () => { a = false } }, [refresh])

  const openOf = (kind: TimeEntryKind) => open.find((e) => e.kind === kind)
  const onShift = Boolean(openOf('shift'))
  const onLunch = Boolean(openOf('lunch'))

  const toggle = async (kind: TimeEntryKind) => {
    if (!currentTenant || !userId) return
    setBusy(true)
    try {
      const existing = openOf(kind)
      if (existing) await endEntry(existing.id)
      else await startEntry(currentTenant.id, userId, kind)
      await refresh()
    } finally { setBusy(false) }
  }

  const todaysJobs = jobs.filter((j) => isToday(j.due_date))
  const upcoming = jobs.filter((j) => !isToday(j.due_date))
  const workedToday = netWorkedMinutes(today)

  if (loading) return <p className="py-10 text-center text-slate-400">Loading your day…</p>

  return (
    <div className="space-y-5">
      {/* Urgent announcements */}
      {announcements.filter((a) => a.urgent).map((a) => (
        <div key={a.id} className="rounded-xl bg-red-600 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wide">⚠ {a.title}</p>
          {a.body && <p className="mt-1 text-sm text-white/90">{a.body}</p>}
        </div>
      ))}

      {/* Clock card */}
      <div className={`rounded-2xl p-5 text-white shadow-sm ${onShift ? 'bg-brand' : 'bg-ink'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/60">{onShift ? (onLunch ? 'On lunch' : 'Clocked on') : 'Clocked off'}</p>
            <p className="mt-1 text-3xl font-bold">{formatHm(workedToday)}</p>
            <p className="text-xs text-white/60">worked today</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => toggle('shift')}
            className={`rounded-full px-6 py-4 text-base font-bold shadow-lg disabled:opacity-60 ${onShift ? 'bg-white text-ink' : 'bg-brand text-white'}`}
          >
            {onShift ? 'Clock off' : 'Clock on'}
          </button>
        </div>
        {onShift && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" disabled={busy} onClick={() => toggle('lunch')} className="rounded-lg bg-white/15 py-2.5 text-sm font-semibold disabled:opacity-60">
              {onLunch ? 'End lunch' : 'Start lunch'}
            </button>
            <button type="button" disabled={busy} onClick={() => toggle('travel')} className="rounded-lg bg-white/15 py-2.5 text-sm font-semibold disabled:opacity-60">
              {openOf('travel') ? 'Stop travel' : 'Start travel'}
            </button>
          </div>
        )}
      </div>

      {/* Today's jobs */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Today&apos;s jobs ({todaysJobs.length})</h2>
          <Link href="/field/jobs" className="text-sm font-semibold text-brand-dark">All jobs →</Link>
        </div>
        {todaysJobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No jobs scheduled today.</div>
        ) : (
          <div className="space-y-3">{todaysJobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Upcoming ({upcoming.length})</h2>
          <div className="space-y-3">{upcoming.slice(0, 5).map((j) => <JobCard key={j.id} job={j} />)}</div>
        </section>
      )}

      {/* Announcements */}
      {announcements.filter((a) => !a.urgent).length > 0 && (
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Announcements</h2>
          <div className="space-y-2">
            {announcements.filter((a) => !a.urgent).map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                {a.body && <p className="mt-0.5 text-sm text-slate-500">{a.body}</p>}
                <p className="mt-1 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString('en-AU')}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/field/jobs/${job.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 leading-tight">{job.title}</p>
          {job.customer_name && <p className="text-sm text-slate-500 truncate">{job.customer_name}</p>}
          {job.customer_address && <p className="text-xs text-slate-400 truncate">{job.customer_address}</p>}
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${PRIORITY_DOT[job.priority] ?? 'bg-slate-400'}`} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${job.status === 'in_progress' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
          {job.status.replace('_', ' ')}
        </span>
        {job.scheduled_start && <span className="text-xs text-slate-400">{job.scheduled_start.slice(0, 5)}</span>}
      </div>
    </Link>
  )
}
