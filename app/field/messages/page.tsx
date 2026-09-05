'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getAnnouncements, type Announcement } from '@/lib/field'

export default function FieldMessages() {
  const { currentTenant } = useAuthContext()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentTenant) return
    getAnnouncements(currentTenant.id).then(setAnnouncements).catch(() => {}).finally(() => setLoading(false))
  }, [currentTenant])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Messages</h1>

      {/* Contact the office */}
      <div className="grid grid-cols-2 gap-3">
        {currentTenant?.phone ? (
          <a href={`tel:${currentTenant.phone}`} className="rounded-xl bg-brand p-4 text-center text-white font-semibold active:bg-brand-dark">📞 Call office</a>
        ) : (
          <div className="rounded-xl bg-slate-200 p-4 text-center text-slate-400 font-semibold">No office number</div>
        )}
        {currentTenant?.phone ? (
          <a href={`sms:${currentTenant.phone}`} className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-center font-semibold text-slate-700 active:bg-slate-50">💬 Text office</a>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-center text-slate-400 font-semibold">—</div>
        )}
      </div>

      {/* Announcements feed */}
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Announcements</h2>
      {loading ? (
        <p className="py-6 text-center text-slate-400">Loading…</p>
      ) : announcements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No announcements from the office.</p>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className={`rounded-xl border p-4 ${a.urgent ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <p className={`text-sm font-semibold ${a.urgent ? 'text-red-800' : 'text-slate-800'}`}>{a.urgent ? '⚠ ' : ''}{a.title}</p>
              {a.body && <p className="mt-0.5 text-sm text-slate-500">{a.body}</p>}
              <p className="mt-1 text-xs text-slate-400">{new Date(a.created_at).toLocaleString('en-AU')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
