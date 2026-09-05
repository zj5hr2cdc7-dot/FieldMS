'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getJob } from '@/lib/jobs'
import { getBranding } from '@/lib/branding'
import {
  getSubmission,
  getTemplate,
  createSubmission,
  saveSubmissionData,
  completeSubmission,
  addSignature,
  getSignatures,
  documentUrl,
} from '@/lib/forms'
import FormRenderer from '@/components/FormRenderer'
import SignaturePad from '@/components/SignaturePad'
import type { FormFieldValue, FormSignature, FormSubmission, SignatureRole, TenantBranding } from '@/types/forms'
import type { Job } from '@/types/database'

const ROLE_LABELS: Record<SignatureRole, string> = {
  technician: 'Technician',
  supervisor: 'Supervisor',
  customer: 'Customer',
  property_owner: 'Property owner',
  site_manager: 'Site manager',
}

function FillPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null

  const [submission, setSubmission] = useState<FormSubmission | null>(null)
  const [signatures, setSignatures] = useState<FormSignature[]>([])
  const [branding, setBranding] = useState<TenantBranding | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [signingRole, setSigningRole] = useState<SignatureRole | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)

  const submissionId = params.get('submission')
  const templateId = params.get('template')
  const jobId = params.get('job')

  // Load or create the submission
  useEffect(() => {
    const load = async () => {
      if (!currentTenant || !user) return
      try {
        const brandingRow = await getBranding(currentTenant.id)
        setBranding(brandingRow)

        if (submissionId) {
          const existing = await getSubmission(submissionId)
          if (!existing) throw new Error('Document not found')
          setSubmission(existing)
          setSignatures(await getSignatures(existing.id))
          if (existing.job_id) setJob(await getJob(existing.job_id))
        } else if (templateId) {
          const template = await getTemplate(templateId)
          if (!template) throw new Error('Template not found')
          const jobRow = jobId ? await getJob(jobId) : null
          setJob(jobRow)
          const created = await createSubmission(
            template,
            currentTenant.id,
            user.id,
            {
              job: jobRow,
              tenant: currentTenant,
              branding: brandingRow,
              technicianName: session?.profile?.full_name ?? session?.user?.email ?? null,
              technicianEmail: session?.user?.email ?? null,
            },
            jobId ?? undefined
          )
          router.replace(`/dashboard/forms/fill?submission=${created.id}`)
          setSubmission(created)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form.')
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTenant, user, submissionId, templateId, jobId])

  const isLocked = submission ? ['completed', 'approved'].includes(submission.status) : false

  const signatureFields = useMemo(
    () => submission?.template_schema.fields.filter((field) => field.type === 'signature' || field.type === 'initials') ?? [],
    [submission]
  )

  const signedRoles = useMemo(() => new Set(signatures.map((s) => s.role)), [signatures])

  const handleFieldChange = (fieldId: string, value: FormFieldValue) => {
    setSubmission((current) => (current ? { ...current, data: { ...current.data, [fieldId]: value } } : current))
  }

  const handleSave = async () => {
    if (!submission) return
    setSaving(true); setError(null)
    try {
      const saved = await saveSubmissionData(submission.id, submission.data)
      setSubmission({ ...saved, data: submission.data })
      setSuccess('Draft saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSignature = async () => {
    if (!submission || !currentTenant || !signingRole || !signatureData || !signerName.trim()) return
    setSaving(true); setError(null)
    try {
      const sig = await addSignature(submission.id, currentTenant.id, signingRole, signerName.trim(), signatureData)
      setSignatures((prev) => [...prev.filter((s) => s.role !== signingRole), sig])
      setSigningRole(null)
      setSignerName('')
      setSignatureData(null)
      setSuccess(`${ROLE_LABELS[signingRole]} signature captured.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature.')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!submission) return
    // Require all signature roles defined in the template
    const missingSigs = signatureFields.filter((f) => f.signatureRole && !signedRoles.has(f.signatureRole))
    if (missingSigs.length > 0) {
      setError(`Signatures required: ${missingSigs.map((f) => ROLE_LABELS[f.signatureRole!]).join(', ')}`)
      return
    }
    setSaving(true); setError(null)
    try {
      const saved = await saveSubmissionData(submission.id, submission.data)
      const template = submission.template_id ? await getTemplate(submission.template_id) : null
      const completed = await completeSubmission(
        { ...saved, data: submission.data },
        template?.doc_prefix || 'DOC',
        branding?.doc_number_format || '{PREFIX}-{YYYY}-{SEQ4}',
        session?.profile?.full_name ?? null
      )
      setSubmission(completed)
      setSuccess(`Document ${completed.doc_number} completed and locked.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete.')
    } finally {
      setSaving(false)
    }
  }

  if (!submission) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">
        {error ?? 'Loading form…'}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/dashboard/forms')} className="text-sm font-medium text-brand-dark hover:text-brand">
            ← Back to forms
          </button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{submission.template_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {job ? `${job.title}${job.customer_name ? ` — ${job.customer_name}` : ''}` : 'Not linked to a job'}
            {submission.doc_number && <span className="ml-2 font-semibold text-slate-700">· {submission.doc_number}</span>}
          </p>
        </div>
        <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
          isLocked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {submission.status.replace('_', ' ')}
        </span>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {isLocked && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-green-800 font-medium">
            This document is completed and read-only. Share it with your customer:
          </p>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const url = documentUrl(submission)
                if (url) { await navigator.clipboard.writeText(url); setSuccess('Document link copied.') }
              }}
              className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
            >
              Copy link
            </button>
            {documentUrl(submission) && (
              <a href={documentUrl(submission)!} target="_blank" rel="noreferrer" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
                View / PDF
              </a>
            )}
            {job && (job.customer_email || job.customer_phone) && (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    const res = await fetch('/api/documents/send', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ submissionId: submission.id }),
                    })
                    const result = await res.json()
                    if (!res.ok) throw new Error(result.error || 'Failed to send')
                    setSuccess('Document emailed/texted to the customer.')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to send.')
                  } finally {
                    setSaving(false)
                  }
                }}
                className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light disabled:opacity-50"
              >
                {saving ? 'Sending…' : 'Send to customer'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form body */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <FormRenderer
          schema={submission.template_schema}
          data={submission.data}
          onChange={handleFieldChange}
          readOnly={isLocked}
          accentColor={branding?.primary_color}
        />
      </div>

      {/* Signatures */}
      {signatureFields.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Signatures</h2>
          <div className="space-y-3">
            {signatureFields.map((field) => {
              const role = field.signatureRole ?? 'technician'
              const existing = signatures.find((s) => s.role === role)
              return (
                <div key={field.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{field.label}</p>
                    <p className="text-xs text-slate-500">
                      {existing ? `Signed by ${existing.signer_name} · ${new Date(existing.signed_at).toLocaleString()}` : 'Not signed yet'}
                    </p>
                  </div>
                  {existing ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={existing.signature_data} alt={`${ROLE_LABELS[role]} signature`} className="h-12 bg-white rounded-md border border-slate-200 px-2" />
                  ) : !isLocked ? (
                    <button
                      type="button"
                      onClick={() => { setSigningRole(role); setSignerName(''); setSignatureData(null) }}
                      className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink-light"
                    >
                      Sign now
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>

          {signingRole && (
            <div className="mt-5 rounded-lg border border-slate-300 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">{ROLE_LABELS[signingRole]} signature</p>
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Full name"
                className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
              />
              <SignaturePad onChange={setSignatureData} />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={!signerName.trim() || !signatureData || saving}
                  onClick={handleAddSignature}
                  className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Save signature
                </button>
                <button type="button" onClick={() => setSigningRole(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
          <button type="button" onClick={handleComplete} disabled={saving} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {saving ? 'Working…' : 'Complete & issue document'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FillPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">Loading…</div>}>
      <FillPageInner />
    </Suspense>
  )
}
