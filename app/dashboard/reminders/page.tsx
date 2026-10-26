'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { normaliseRole } from '@/lib/roles'
import { createClient } from '@/utils/supabase/client'

interface Settings {
  quote_reminders: boolean
  invoice_reminders: boolean
  testing_digest: boolean
}

const DEFAULTS: Settings = { quote_reminders: false, invoice_reminders: false, testing_digest: true }

const OPTIONS: { key: keyof Settings; title: string; body: string }[] = [
  {
    key: 'quote_reminders',
    title: 'Follow up quotes',
    body: 'Emails your customer 3 and 7 days after you send a quote they have not approved or declined.',
  },
  {
    key: 'invoice_reminders',
    title: 'Chase overdue invoices',
    body: 'Emails your customer 7, 14 and 30 days after the due date while money is still owing. Stops as soon as it is paid.',
  },
  {
    key: 'testing_digest',
    title: 'Weekly testing-due list',
    body: 'Every Monday morning, emails you the assets in your compliance register whose test is overdue or due in the next 30 days.',
  },
]

export default function RemindersPage() {
  const { currentTenant, userRole } = useAuthContext()
  const isOwner = normaliseRole(userRole) === 'owner'
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<keyof Settings | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    createClient()
      .from('tenant_reminder_settings')
      .select('quote_reminders, invoice_reminders, testing_digest')
      .eq('tenant_id', currentTenant.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (data) setSettings(data as Settings)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  const toggle = async (key: keyof Settings) => {
    if (!currentTenant || !isOwner) return
    const next = { ...settings, [key]: !settings[key] }
    setSaving(key)
    setError('')
    const { error: err } = await createClient()
      .from('tenant_reminder_settings')
      .upsert({ tenant_id: currentTenant.id, ...next, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' })
    if (err) setError('Could not save. Try again.')
    else setSettings(next)
    setSaving(null)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Automatic reminders</h1>
        <p className="mt-1 text-slate-500">
          Let FieldMS do the chasing. Customer emails come from your business name, and replies go to you.
        </p>
      </div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
        {OPTIONS.map((o) => (
          <div key={o.key} className="flex items-start justify-between gap-4 p-5">
            <div>
              <p className="font-semibold text-slate-900">{o.title}</p>
              <p className="mt-1 text-sm text-slate-500">{o.body}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings[o.key]}
              aria-label={o.title}
              disabled={loading || !isOwner || saving !== null}
              onClick={() => toggle(o.key)}
              className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${settings[o.key] ? 'bg-brand' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${settings[o.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
      {!isOwner && <p className="text-sm text-slate-500">Only the workspace owner can change these.</p>}
      <p className="text-xs text-slate-400">
        Reminders go out once a day at about 7am. A customer needs an email address on the quote or job to receive them.
      </p>
    </div>
  )
}
