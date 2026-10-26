'use client'

/**
 * "Message customer" — pick a template, tweak it for this job, preview it
 * with the real merge values, send by SMS and/or email.
 *
 * Edits made here are one-off and are not saved back to the template; the
 * library under Messages is where wording is changed for good.
 *
 * The preview and the send both go through /api/messages/send, so what the
 * office sees is exactly what the customer gets.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { loadTemplates, listJobMessages } from '@/lib/messages'
import {
  CATEGORY_LABELS,
  smsSegments,
  type ResolvedTemplate,
  type TemplateCategory,
} from '@/lib/message-templates'
import type { CustomerMessage } from '@/types/database'

interface Preview {
  subject: string
  sms: string
  emailText: string
  missing: string[]
}

export default function MessageCustomer({
  jobId,
  tenantId,
  customerPhone,
  customerEmail,
  showHistory = false,
  initialTemplateKey,
  buttonClassName,
}: {
  jobId: string
  tenantId: string
  customerPhone: string | null
  customerEmail: string | null
  /** Owner/manager only — the log is not readable by technicians. */
  showHistory?: boolean
  initialTemplateKey?: string
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [templates, setTemplates] = useState<ResolvedTemplate[]>([])
  const [selected, setSelected] = useState<string>('')
  const [subject, setSubject] = useState('')
  const [smsBody, setSmsBody] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [useSms, setUseSms] = useState(!!customerPhone)
  const [useEmail, setUseEmail] = useState(!customerPhone && !!customerEmail)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [history, setHistory] = useState<CustomerMessage[]>([])
  const previewSeq = useRef(0)

  const templateId = (t: ResolvedTemplate) => t.id ?? `builtin:${t.key}`
  const current = templates.find((t) => templateId(t) === selected) ?? null

  useEffect(() => {
    if (!open) return
    loadTemplates(tenantId)
      .then((list) => {
        setTemplates(list)
        if (initialTemplateKey) {
          const t = list.find((x) => x.key === initialTemplateKey)
          if (t) pick(t)
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load templates'))
    if (showHistory) listJobMessages(jobId).then(setHistory).catch(() => setHistory([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tenantId, jobId, showHistory])

  const pick = (t: ResolvedTemplate) => {
    setSelected(templateId(t))
    setSubject(t.subject)
    setSmsBody(t.sms_body)
    setEmailBody(t.email_body)
    setSent(null)
    setError(null)
  }

  // Live preview, debounced; stale responses are dropped.
  useEffect(() => {
    if (!open || !selected) { setPreview(null); return }
    const seq = ++previewSeq.current
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId, subject, sms_body: smsBody, email_body: emailBody,
            channels: { sms: useSms, email: useEmail }, preview: true,
          }),
        })
        const json = await res.json()
        if (seq !== previewSeq.current) return
        if (!res.ok) { setError(json.error ?? 'Preview failed'); return }
        setPreview(json)
      } catch {
        if (seq === previewSeq.current) setError('Preview failed')
      }
    }, 350)
    return () => window.clearTimeout(handle)
  }, [open, selected, subject, smsBody, emailBody, useSms, useEmail, jobId])

  const grouped = useMemo(() => {
    const g = new Map<TemplateCategory, ResolvedTemplate[]>()
    for (const t of templates) g.set(t.category, [...(g.get(t.category) ?? []), t])
    return [...g.entries()]
  }, [templates])

  const send = async () => {
    if (!current) return
    setBusy(true); setError(null); setSent(null)
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId, templateKey: current.key, templateName: current.name,
          subject, sms_body: smsBody, email_body: emailBody,
          channels: { sms: useSms, email: useEmail },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Send failed')
      const how = [json.sentSms && 'SMS', json.sentEmail && 'email'].filter(Boolean).join(' and ')
      setSent(`Sent by ${how}.`)
      if (showHistory) listJobMessages(jobId).then(setHistory).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setBusy(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'
  const noContact = !customerPhone && !customerEmail

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName ?? 'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50'}
      >
        Message customer
      </button>
    )
  }

  const canSend = !!current && !busy && (useSms || useEmail) && (preview?.missing.length ?? 0) === 0

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Message customer</h3>
        <button type="button" onClick={() => { setOpen(false); setSelected(''); setPreview(null); setError(null); setSent(null) }}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800">Close</button>
      </div>

      {noContact ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          This job has no customer phone or email. Add one to the job first.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Template</span>
              <select value={selected} onChange={(e) => { const t = templates.find((x) => templateId(x) === e.target.value); if (t) pick(t) }} className={inputCls}>
                <option value="">Choose a template…</option>
                {grouped.map(([cat, list]) => (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {list.map((t) => <option key={templateId(t)} value={templateId(t)}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-4 pb-2 text-sm">
              <label className={`flex items-center gap-2 ${customerPhone ? '' : 'opacity-40'}`}>
                <input type="checkbox" checked={useSms} disabled={!customerPhone} onChange={(e) => setUseSms(e.target.checked)} />
                SMS
              </label>
              <label className={`flex items-center gap-2 ${customerEmail ? '' : 'opacity-40'}`}>
                <input type="checkbox" checked={useEmail} disabled={!customerEmail} onChange={(e) => setUseEmail(e.target.checked)} />
                Email
              </label>
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            To {[customerPhone, customerEmail].filter(Boolean).join(' · ')}. Changes here are for this message only;{' '}
            <Link href="/dashboard/messages" className="underline hover:text-slate-600">edit templates</Link> to change them for good.
          </p>

          {current && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {useSms && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">SMS</span>
                    <textarea rows={4} value={smsBody} onChange={(e) => setSmsBody(e.target.value)} className={inputCls} />
                  </label>
                )}
                {useEmail && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Email subject</span>
                      <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">Email</span>
                      <textarea rows={8} value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className={inputCls} />
                    </label>
                  </>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">What the customer gets</p>
                {preview?.missing && preview.missing.length > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    This job has nothing to fill in for {preview.missing.map((m) => `{${m}}`).join(', ')}.
                    {preview.missing.includes('invoice_link') && ' Send an invoice first.'}
                    {preview.missing.includes('quote_link') && ' Link a quote to this job first.'}
                    {preview.missing.includes('review_link') && ' Add your Google review link under Reviews.'}
                  </div>
                )}
                {useSms && preview && (
                  <div className="rounded-2xl rounded-bl-sm bg-slate-100 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                    {preview.sms}
                    <p className="mt-2 text-[11px] text-slate-400">{preview.sms.length} characters · {smsSegments(preview.sms)} SMS</p>
                  </div>
                )}
                {useEmail && preview && (
                  <div className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-semibold text-slate-900">{preview.subject}</p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-700">{preview.emailText}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {sent && <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{sent}</div>}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={send} disabled={!canSend}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </>
      )}

      {showHistory && history.length > 0 && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sent on this job</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {history.map((m) => (
              <li key={m.id} className="flex flex-wrap justify-between gap-2 text-slate-600">
                <span>
                  {m.template_name ?? 'Message'}
                  {m.source === 'review_request_auto' && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">automatic</span>}
                </span>
                <span className="text-slate-400">
                  {[m.to_phone && 'SMS', m.to_email && 'email'].filter(Boolean).join(' + ')} ·{' '}
                  {new Date(m.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
