'use client'

/**
 * Messages: the business's SMS / email template library, the automatic
 * review request switch, and a log of what has gone out.
 *
 * Built-in templates come from lib/message-templates.ts. Editing one saves a
 * copy for this business only; "Restore default" drops the copy.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { getTenant, updateTenant } from '@/lib/auth'
import { can, isOffice } from '@/lib/roles'
import {
  CATEGORY_LABELS,
  MERGE_FIELDS,
  renderTemplate,
  smsSegments,
  type MergeValues,
  type ResolvedTemplate,
  type TemplateCategory,
  type TemplateContent,
} from '@/lib/message-templates'
import { deleteCustomTemplate, listRecentMessages, loadTemplates, restoreBuiltIn, saveTemplate } from '@/lib/messages'
import type { CustomerMessage, Tenant } from '@/types/database'

const EXAMPLE_VALUES: MergeValues = Object.fromEntries(MERGE_FIELDS.map((f) => [f.token, f.example]))

const SOURCE_BADGE: Record<ResolvedTemplate['source'], { label: string; cls: string }> = {
  built_in: { label: 'Built-in', cls: 'bg-slate-100 text-slate-500' },
  edited: { label: 'Edited', cls: 'bg-amber-100 text-amber-700' },
  custom: { label: 'Yours', cls: 'bg-green-100 text-green-700' },
}

const NEW_TEMPLATE: ResolvedTemplate = {
  id: null, key: null, source: 'custom', name: '', category: 'custom', subject: '', sms_body: '', email_body: '',
}

type Field = 'subject' | 'sms_body' | 'email_body'

export default function MessagesPage() {
  const { currentTenant, session, userRole } = useAuthContext()
  const office = isOffice(userRole)
  const owner = can(userRole, 'manageSettings')

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [templates, setTemplates] = useState<ResolvedTemplate[]>([])
  const [log, setLog] = useState<CustomerMessage[]>([])
  const [editing, setEditing] = useState<ResolvedTemplate | null>(null)
  const [draft, setDraft] = useState<TemplateContent | null>(null)
  const [lastField, setLastField] = useState<Field>('sms_body')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const refs = {
    subject: useRef<HTMLInputElement>(null),
    sms_body: useRef<HTMLTextAreaElement>(null),
    email_body: useRef<HTMLTextAreaElement>(null),
  }

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    window.setTimeout(() => setMsg(null), 3500)
  }

  const load = useCallback(async () => {
    if (!currentTenant) return
    const [t, list] = await Promise.all([getTenant(currentTenant.id), loadTemplates(currentTenant.id)])
    setTenant(t)
    setTemplates(list)
    if (office) listRecentMessages(currentTenant.id, 30).then(setLog).catch(() => setLog([]))
  }, [currentTenant, office])

  useEffect(() => { load().catch((e) => flash(false, e instanceof Error ? e.message : 'Could not load')) }, [load])

  const grouped = useMemo(() => {
    const order: TemplateCategory[] = ['quotes', 'scheduling', 'payments', 'reviews', 'follow_up', 'custom']
    return order
      .map((c) => [c, templates.filter((t) => t.category === c)] as const)
      .filter(([, list]) => list.length > 0)
  }, [templates])

  const startEdit = (t: ResolvedTemplate) => {
    setEditing(t)
    setDraft({ name: t.name, category: t.category, subject: t.subject, sms_body: t.sms_body, email_body: t.email_body })
  }

  const insertToken = (token: string) => {
    if (!draft) return
    const el = refs[lastField].current
    const value = draft[lastField]
    const tag = `{${token}}`
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const next = value.slice(0, start) + tag + value.slice(end)
    setDraft({ ...draft, [lastField]: next })
    window.requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(start + tag.length, start + tag.length)
    })
  }

  const handleSave = async () => {
    if (!currentTenant || !editing || !draft) return
    if (!draft.sms_body.trim() && !draft.email_body.trim()) { flash(false, 'Write an SMS or an email.'); return }
    setSaving(true)
    try {
      await saveTemplate(currentTenant.id, session?.user?.id ?? null, editing, draft)
      setEditing(null); setDraft(null)
      await load()
      flash(true, 'Template saved.')
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (t: ResolvedTemplate) => {
    if (!t.id) return
    await restoreBuiltIn(t.id)
    setEditing(null); setDraft(null)
    await load()
    flash(true, `“${t.name}” is back to the default wording.`)
  }

  const handleDelete = async (t: ResolvedTemplate) => {
    if (!t.id) return
    await deleteCustomTemplate(t.id)
    setEditing(null); setDraft(null)
    await load()
    flash(true, 'Template deleted.')
  }

  const toggle = async (field: 'review_request_enabled' | 'review_request_sms' | 'review_request_email', value: boolean) => {
    if (!currentTenant || !tenant) return
    try {
      const updated = await updateTenant(currentTenant.id, { [field]: value })
      setTenant(updated)
    } catch (e) {
      flash(false, e instanceof Error ? e.message : 'Could not save')
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'
  const hasReviewLink = !!tenant?.google_reviews_url

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ready-to-send SMS and emails for quote follow-ups, reminders, payment chasers and reviews. Send them from any
          job with <strong>Message customer</strong>; customer details and links fill in automatically.
        </p>
      </div>

      {msg && (
        <div className={`rounded-lg border p-3 text-sm ${msg.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Automatic review requests */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-bold text-slate-900">Ask for a Google review when a job is completed</h2>
            <p className="mt-1 text-sm text-slate-500">
              When a job is marked complete, the customer gets your <em>Google review request</em> template. Each job is
              asked once, and customers who have unsubscribed are skipped.
            </p>
          </div>
          <label className={`flex items-center gap-3 ${owner && hasReviewLink ? '' : 'opacity-50'}`}>
            <span className="text-sm font-semibold text-slate-700">{tenant?.review_request_enabled ? 'On' : 'Off'}</span>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={!!tenant?.review_request_enabled}
              disabled={!owner || !hasReviewLink}
              onChange={(e) => toggle('review_request_enabled', e.target.checked)}
            />
          </label>
        </div>

        {!hasReviewLink && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Add your Google review link first under{' '}
            <Link href="/dashboard/reviews" className="font-semibold underline">Reviews QR</Link>.
          </p>
        )}
        {hasReviewLink && tenant?.review_request_enabled && (
          <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={!owner} checked={tenant.review_request_sms !== false}
                onChange={(e) => toggle('review_request_sms', e.target.checked)} />
              By SMS
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" disabled={!owner} checked={tenant.review_request_email !== false}
                onChange={(e) => toggle('review_request_email', e.target.checked)} />
              By email
            </label>
          </div>
        )}
        {!owner && <p className="mt-3 text-xs text-slate-400">Only the business owner can change this.</p>}
      </section>

      {/* Template editor */}
      {editing && draft && (
        <section className="rounded-xl border-2 border-brand/40 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{editing.id || editing.key ? `Edit “${editing.name}”` : 'New template'}</h2>
            <button type="button" onClick={() => { setEditing(null); setDraft(null) }} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Cancel</button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Name</span>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} placeholder="e.g. Hot water quote follow-up" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">SMS</span>
                <textarea ref={refs.sms_body} rows={4} value={draft.sms_body} onFocus={() => setLastField('sms_body')}
                  onChange={(e) => setDraft({ ...draft, sms_body: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Email subject</span>
                <input ref={refs.subject} value={draft.subject} onFocus={() => setLastField('subject')}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={inputCls} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">Email</span>
                <textarea ref={refs.email_body} rows={9} value={draft.email_body} onFocus={() => setLastField('email_body')}
                  onChange={(e) => setDraft({ ...draft, email_body: e.target.value })} className={inputCls} />
              </label>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-slate-600">Insert a field</p>
                <div className="flex flex-wrap gap-1.5">
                  {MERGE_FIELDS.map((f) => (
                    <button key={f.token} type="button" title={f.label} onClick={() => insertToken(f.token)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 hover:border-brand hover:text-slate-900">
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview with example details</p>
              {draft.sms_body.trim() && (
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 p-3 text-sm whitespace-pre-wrap text-slate-800">
                  {renderTemplate(draft.sms_body, EXAMPLE_VALUES)}
                  <p className="mt-2 text-[11px] text-slate-400">
                    About {smsSegments(renderTemplate(draft.sms_body, EXAMPLE_VALUES))} SMS per send
                  </p>
                </div>
              )}
              {draft.email_body.trim() && (
                <div className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{renderTemplate(draft.subject, EXAMPLE_VALUES)}</p>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{renderTemplate(draft.email_body, EXAMPLE_VALUES)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap justify-between gap-3">
            <div>
              {editing.source === 'edited' && (
                <button type="button" onClick={() => handleRestore(editing)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Restore default wording</button>
              )}
              {editing.source === 'custom' && editing.id && (
                <button type="button" onClick={() => handleDelete(editing)} className="text-sm font-semibold text-red-500 hover:text-red-700">Delete template</button>
              )}
            </div>
            <button type="button" onClick={handleSave} disabled={saving}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
              {saving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </section>
      )}

      {/* Library */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Templates</h2>
            <p className="text-sm text-slate-500">{office ? 'Edit any of these to make them sound like you.' : 'Your office manages these templates.'}</p>
          </div>
          {office && (
            <button type="button" onClick={() => startEdit(NEW_TEMPLATE)}
              className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light">New template</button>
          )}
        </div>

        <div className="mt-4 space-y-6">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{CATEGORY_LABELS[cat]}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((t) => (
                  <div key={t.id ?? t.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_BADGE[t.source].cls}`}>{SOURCE_BADGE[t.source].label}</span>
                    </div>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-500">{t.sms_body || t.email_body}</p>
                    {office && (
                      <button type="button" onClick={() => startEdit(t)} className="mt-3 text-sm font-semibold text-brand-dark hover:text-brand">Edit</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Log */}
      {office && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Recently sent</h2>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing sent yet. Open a job and use Message customer.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">When</th>
                    <th className="px-4 py-2.5 font-semibold">Template</th>
                    <th className="px-4 py-2.5 font-semibold">To</th>
                    <th className="px-4 py-2.5 font-semibold">Job</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {log.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {new Date(m.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {m.template_name ?? 'Message'}
                        {m.source === 'review_request_auto' && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">automatic</span>}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{[m.to_phone, m.to_email].filter(Boolean).join(' · ')}</td>
                      <td className="px-4 py-2.5">
                        {m.job_id ? <Link href={`/dashboard/jobs/${m.job_id}/billing`} className="text-brand-dark hover:text-brand">Open</Link> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
