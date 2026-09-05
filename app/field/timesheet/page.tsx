'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import {
  getEntriesInRange, submitTimesheet, durationMinutes, formatHm, netWorkedMinutes,
  startOfWeekIso, startOfTodayIso, type TimeEntry,
} from '@/lib/time-tracking'

const KIND_LABEL: Record<string, string> = { shift: 'Shift', travel: 'Travel', lunch: 'Lunch', overtime: 'Overtime' }

export default function FieldTimesheet() {
  const { session } = useAuthContext()
  const userId = session?.user?.id
  const [week, setWeek] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) return
    setWeek(await getEntriesInRange(userId, startOfWeekIso()))
    setLoading(false)
  }, [userId])

  useEffect(() => { let a = true; (async () => { try { await refresh() } catch { if (a) setLoading(false) } })(); return () => { a = false } }, [refresh])

  const todayEntries = week.filter((e) => new Date(e.started_at) >= new Date(startOfTodayIso()))
  const weekWorked = netWorkedMinutes(week.filter((e) => e.ended_at))
  const todayWorked = netWorkedMinutes(todayEntries.filter((e) => e.ended_at))
  const unsubmitted = week.filter((e) => e.ended_at && !e.submitted).length

  // Group by day
  const byDay = new Map<string, TimeEntry[]>()
  for (const e of week) {
    const key = new Date(e.started_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
    byDay.set(key, [...(byDay.get(key) ?? []), e])
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Timesheet</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-ink p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-white/60">Today</p>
          <p className="mt-1 text-2xl font-bold">{formatHm(todayWorked)}</p>
        </div>
        <div className="rounded-xl bg-brand p-4 text-white">
          <p className="text-xs uppercase tracking-wide text-white/70">This week</p>
          <p className="mt-1 text-2xl font-bold">{formatHm(weekWorked)}</p>
        </div>
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      {loading ? (
        <p className="py-10 text-center text-slate-400">Loading…</p>
      ) : week.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          No time recorded this week. Clock on from the home screen.
        </div>
      ) : (
        <>
          {[...byDay.entries()].map(([day, entries]) => (
            <div key={day} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">{day}</p>
                <p className="text-sm font-bold text-slate-900">{formatHm(netWorkedMinutes(entries.filter((e) => e.ended_at)))}</p>
              </div>
              <div className="mt-2 space-y-1">
                {entries.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs text-slate-500">
                    <span>{KIND_LABEL[e.kind]} · {new Date(e.started_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}{e.ended_at ? `–${new Date(e.ended_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ' (running)'}</span>
                    <span className="font-medium text-slate-700">{e.ended_at ? formatHm(durationMinutes(e)) : '…'}{e.submitted ? ' ✓' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            disabled={busy || unsubmitted === 0}
            onClick={async () => {
              if (!userId) return
              setBusy(true); setMsg(null)
              try {
                const n = await submitTimesheet(userId, startOfWeekIso())
                setMsg(`${n} entr${n === 1 ? 'y' : 'ies'} submitted to the office.`)
                await refresh()
              } finally { setBusy(false) }
            }}
            className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white active:bg-brand-dark disabled:opacity-50"
          >
            {unsubmitted === 0 ? 'All time submitted' : `Submit ${unsubmitted} entr${unsubmitted === 1 ? 'y' : 'ies'}`}
          </button>
        </>
      )}
    </div>
  )
}
