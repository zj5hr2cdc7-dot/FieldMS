'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getMyJobs } from '@/lib/field'
import { getJob } from '@/lib/jobs'
import {
  getTemplates, getSubmissions, getSubmission, createSubmission, saveSubmissionData,
  completeSubmission, addSignature, getSignatures,
} from '@/lib/forms'
import FormRenderer from '@/components/FormRenderer'
import SignaturePad from '@/components/SignaturePad'
import type { FormFieldValue, FormSignature, FormSubmission, FormTemplate, SignatureRole } from '@/types/forms'
import type { Job } from '@/types/database'

const ROLE_LABELS: Record<SignatureRole, string> = {
  technician: 'Technician', supervisor: 'Supervisor', customer: 'Customer', property_owner: 'Property owner', site_manager: 'Site manager',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', awaiting_signature: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700', approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-700',
}

function FormsInner() {
  const params = useSearchParams()
  const { currentTenant, session } = useAuthContext()
  const userId = session?.user?.id
  const jobParam = params.get('job')

  const [jobs, setJobs] = useState<Job[]>([])
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [active, setActive] = useState<FormSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!currentTenant || !userId) return
    const [j, t, s] = await Promise.all([getMyJobs(userId), getTemplates(currentTenant.id), getSubmissions(currentTenant.id)])
    setJobs(j); setTemplates(t)
    // Only submissions tied to jobs assigned to this member
    const myJobIds = new Set(j.map((x) => x.id))
    setSubmissions(s.filter((sub) => sub.job_id && myJobIds.has(sub.job_id)))
    setLoading(false)
  }, [currentTenant, userId])

  useEffect(() => { let a = true; (async () => { try { await refresh() } catch { if (a) setLoading(false) } })(); return () => { a = false } }, [refresh])

  if (active) {
    return <FieldFill submission={active} onBack={async () => { setActive(null); await refresh() }} />
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">Forms</h1>

      {/* Start a form */}
      <StartForm
        jobs={jobs} templates={templates} defaultJobId={jobParam ?? ''}
        onStarted={(sub) => setActive(sub)}
      />

      {/* Recent submissions */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">Recent forms</h2>
        {loading ? (
          <p className="py-6 text-center text-slate-400">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-400">No forms yet.</p>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 20).map((s) => (
              <button key={s.id} type="button"
                onClick={async () => { const full = await getSubmission(s.id); if (full) setActive(full) }}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-left active:bg-slate-50">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{s.template_name}</p>
                  <p className="text-xs text-slate-400">{s.doc_number ?? new Date(s.created_at).toLocaleDateString('en-AU')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[s.status]}`}>{s.status.replace('_', ' ')}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StartForm({ jobs, templates, defaultJobId, onStarted }: {
  jobs: Job[]; templates: FormTemplate[]; defaultJobId: string; onStarted: (s: FormSubmission) => void
}) {
  const { currentTenant, session } = useAuthContext()
  const [jobId, setJobId] = useState(defaultJobId)
  const [templateId, setTemplateId] = useState('')
  const [busy, setBusy] = useState(false)
  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand'

  const start = async () => {
    if (!currentTenant || !session?.user || !templateId) return
    const template = templates.find((t) => t.id === templateId)
    if (!template) return
    setBusy(true)
    try {
      const job = jobId ? await getJob(jobId) : null
      const sub = await createSubmission(template, currentTenant.id, session.user.id, {
        job, tenant: currentTenant,
        technicianName: session.profile?.full_name ?? session.user.email ?? null,
        technicianEmail: session.user.email ?? null,
      }, jobId || undefined)
      onStarted(sub)
    } finally { setBusy(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-800">Start a form</p>
      <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={inputCls}>
        <option value="">No job (blank)</option>
        {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.customer_name ? ` — ${j.customer_name}` : ''}</option>)}
      </select>
      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
        <option value="">Choose a form…</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button type="button" disabled={busy || !templateId} onClick={start}
        className="w-full rounded-lg bg-brand py-3 text-base font-bold text-white active:bg-brand-dark disabled:opacity-50">
        {busy ? 'Starting…' : 'Start form'}
      </button>
    </div>
  )
}

function FieldFill({ submission, onBack }: { submission: FormSubmission; onBack: () => void }) {
  const { session } = useAuthContext()
  const actorName = session?.profile?.full_name ?? null
  const [data, setData] = useState<Record<string, FormFieldValue>>(submission.data)
  const [signatures, setSignatures] = useState<FormSignature[]>([])
  const [signingRole, setSigningRole] = useState<SignatureRole | null>(null)
  const [signerName, setSignerName] = useState('')
  const [sigData, setSigData] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [status, setStatus] = useState(submission.status)

  useEffect(() => { getSignatures(submission.id).then(setSignatures).catch(() => {}) }, [submission.id])

  const locked = ['completed', 'approved'].includes(status)
  const sigFields = useMemo(() => submission.template_schema.fields.filter((f) => f.type === 'signature' || f.type === 'initials'), [submission])
  const signedRoles = useMemo(() => new Set(signatures.map((s) => s.role)), [signatures])

  const save = async () => {
    setBusy(true); setMsg(null)
    try { await saveSubmissionData(submission.id, data); setMsg('Saved.') }
    catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  const complete = async () => {
    const missing = sigFields.filter((f) => f.signatureRole && !signedRoles.has(f.signatureRole))
    if (missing.length) { setMsg(`Signatures needed: ${missing.map((f) => ROLE_LABELS[f.signatureRole!]).join(', ')}`); return }
    setBusy(true); setMsg(null)
    try {
      const saved = await saveSubmissionData(submission.id, data)
      const done = await completeSubmission({ ...saved, data }, 'DOC', '{PREFIX}-{YYYY}-{SEQ4}', actorName)
      setStatus(done.status)
      setMsg(`Completed — ${done.doc_number}.`)
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-brand-dark">← Forms</button>
      <div>
        <h1 className="text-lg font-bold text-slate-900">{submission.template_name}</h1>
        <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${STATUS_COLORS[status]}`}>{status.replace('_', ' ')}</span>
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
        <FormRenderer schema={submission.template_schema} data={data} readOnly={locked}
          onChange={(id, v) => setData((d) => ({ ...d, [id]: v }))} />
      </div>

      {/* Signatures */}
      {sigFields.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Signatures</p>
          {sigFields.map((f) => {
            const role = f.signatureRole ?? 'technician'
            const existing = signatures.find((s) => s.role === role)
            return (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{ROLE_LABELS[role]}</p>
                  <p className="text-xs text-slate-400">{existing ? `Signed by ${existing.signer_name}` : 'Not signed'}</p>
                </div>
                {existing ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={existing.signature_data} alt="signature" className="h-10 rounded-md border border-slate-200 bg-white px-1" />
                ) : !locked ? (
                  <button type="button" onClick={() => { setSigningRole(role); setSignerName(''); setSigData(null) }}
                    className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white">Sign</button>
                ) : null}
              </div>
            )
          })}

          {signingRole && (
            <div className="rounded-lg border border-slate-300 p-3">
              <p className="text-sm font-semibold text-slate-800 mb-2">{ROLE_LABELS[signingRole]} signature</p>
              <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Full name" className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" />
              <SignaturePad onChange={setSigData} />
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!signerName.trim() || !sigData || busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const sig = await addSignature(submission.id, submission.tenant_id, signingRole, signerName.trim(), sigData!)
                      setSignatures((prev) => [...prev.filter((s) => s.role !== signingRole), sig])
                      setSigningRole(null)
                    } finally { setBusy(false) }
                  }}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save</button>
                <button type="button" onClick={() => setSigningRole(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {!locked && (
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={busy} className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm py-3 text-base font-semibold text-slate-700 disabled:opacity-50">Save</button>
          <button type="button" onClick={complete} disabled={busy} className="flex-1 rounded-xl bg-brand py-3 text-base font-bold text-white active:bg-brand-dark disabled:opacity-50">Complete</button>
        </div>
      )}
    </div>
  )
}

export default function FieldForms() {
  return <Suspense fallback={<p className="py-10 text-center text-slate-400">Loading…</p>}><FormsInner /></Suspense>
}
