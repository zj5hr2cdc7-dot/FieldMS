'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getAnnouncements, type Announcement } from '@/lib/field'
import { postAnnouncement, deleteAnnouncement, getTenantTimesheets, type TimesheetRow } from '@/lib/staff'
import { netWorkedMinutes, formatHm, startOfWeekIso } from '@/lib/time-tracking'

export default function StaffPage() {
  const { currentTenant, session, userRole } = useAuthContext()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const [tab, setTab] = useState<'timesheets' | 'announcements'>('timesheets')
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!currentTenant) return
    const [ts, an] = await Promise.all([
      getTenantTimesheets(currentTenant.id, startOfWeekIso()),
      getAnnouncements(currentTenant.id),
    ])
    setTimesheets(ts); setAnnouncements(an)
  }, [currentTenant])

  useEffect(() => {
    let a = true
    ;(async () => { try { await refresh() } catch (e) { if (a) setError(e instanceof Error ? e.message : 'Failed to load') } })()
    return () => { a = false }
  }, [refresh])

  // Group timesheets by worker
  const byWorker = useMemo(() => {
    const m = new Map<string, TimesheetRow[]>()
    for (const t of timesheets) m.set(t.workerName, [...(m.get(t.workerName) ?? []), t])
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [timesheets])

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  if (!isAdmin) {
    return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">This page is for owners and managers.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Staff</h1>
        <p className="text-slate-500 mt-1">Review submitted timesheets and post announcements to your field team.</p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      <div className="flex gap-1 border-b border-slate-200">
        {([['timesheets', 'Timesheets'], ['announcements', 'Announcements']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === k ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'timesheets' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">This week&apos;s recorded time. Submitted entries are marked ✓.</p>
          {byWorker.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">No time recorded this week.</div>
          ) : byWorker.map(([worker, entries]) => {
            const worked = netWorkedMinutes(entries)
            const submitted = entries.filter((e) => e.submitted).length
            return (
              <div key={worker} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{worker}</p>
                    <p className="text-xs text-slate-400">{entries.length} entries · {submitted} submitted</p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{formatHm(worked)}</p>
                </div>
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-2">
                  {entries.slice(0, 8).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs text-slate-500">
                      <span className="capitalize">{e.kind} · {new Date(e.started_at).toLocaleDateString('en-AU', { weekday: 'short' })} {new Date(e.started_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>{e.submitted ? <span className="text-green-600 font-semibold">✓ submitted</span> : <span className="text-amber-600">pending</span>}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">Post an announcement</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={inputCls} />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Message to the team (optional)" className={inputCls} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="accent-brand" />
              Mark as urgent (shown as a red banner in the field app)
            </label>
            <button type="button" disabled={busy || !title.trim()}
              onClick={async () => {
                if (!currentTenant || !session?.user) return
                setBusy(true); setError(null)
                try {
                  await postAnnouncement(currentTenant.id, session.user.id, { title: title.trim(), body: body.trim() || undefined, urgent })
                  setTitle(''); setBody(''); setUrgent(false)
                  setSuccess('Announcement posted to your team.')
                  await refresh()
                } catch (e) { setError(e instanceof Error ? e.message : 'Failed to post') } finally { setBusy(false) }
              }}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {busy ? 'Posting…' : 'Post announcement'}
            </button>
          </div>

          <div className="space-y-2">
            {announcements.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-400">No announcements yet.</p>
            ) : announcements.map((a) => (
              <div key={a.id} className={`rounded-xl border p-4 ${a.urgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${a.urgent ? 'text-red-800' : 'text-slate-800'}`}>{a.urgent ? '⚠ ' : ''}{a.title}</p>
                    {a.body && <p className="mt-0.5 text-sm text-slate-500">{a.body}</p>}
                    <p className="mt-1 text-xs text-slate-400">{new Date(a.created_at).toLocaleString('en-AU')}</p>
                  </div>
                  <button type="button" onClick={async () => { await deleteAnnouncement(a.id); refresh() }} className="text-xs font-semibold text-red-500 hover:text-red-600 shrink-0">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
