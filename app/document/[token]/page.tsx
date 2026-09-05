'use client'

import { use, useEffect, useState } from 'react'
import FormRenderer from '@/components/FormRenderer'
import SignaturePad from '@/components/SignaturePad'
import type { FormFieldValue, FormTemplateSchema } from '@/types/forms'

interface PortalData {
  document: {
    template_name: string
    template_schema: FormTemplateSchema
    data: Record<string, FormFieldValue>
    status: string
    doc_number: string | null
    revision: number
    created_at: string
    completed_at: string | null
  }
  job: { title: string; customer_name: string | null; customer_address: string | null } | null
  business: { name: string; abn: string | null; phone: string | null; website: string | null } | null
  branding: {
    trading_name: string | null
    license_number: string | null
    electrical_license: string | null
    business_address: string | null
    primary_color: string
    secondary_color: string
    accent_color: string
    font_family: string
    logo_position: 'left' | 'center' | 'right'
    footer_text: string | null
    acn: string | null
  } | null
  logo_url: string | null
  watermark_url: string | null
  signatures: { role: string; signer_name: string; signature_data: string; signed_at: string }[]
}

const CUSTOMER_ROLES = ['customer', 'property_owner', 'site_manager']
const ROLE_LABELS: Record<string, string> = {
  technician: 'Technician',
  supervisor: 'Supervisor',
  customer: 'Customer',
  property_owner: 'Property owner',
  site_manager: 'Site manager',
}

export default function CustomerDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [signingRole, setSigningRole] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = () => {
    fetch(`/api/documents/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Document not found or link expired.'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  const post = async (payload: Record<string, unknown>) => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/documents/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Something went wrong.')
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4"><p className="text-slate-500">{error}</p></div>
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Loading document…</p></div>
  }

  const { document: doc, job, business, branding, logo_url, watermark_url, signatures } = data
  const brand = {
    primary: branding?.primary_color ?? '#4a9c4a',
    secondary: branding?.secondary_color ?? '#1a2332',
    font: branding?.font_family ?? 'Inter',
  }
  const businessName = branding?.trading_name || business?.name || ''
  const isDecided = ['approved', 'rejected'].includes(doc.status)

  // Roles the customer can still sign
  const signedRoles = new Set(signatures.map((s) => s.role))
  const outstandingCustomerRoles = (doc.template_schema.fields || [])
    .filter((f) => (f.type === 'signature' || f.type === 'initials') && f.signatureRole && CUSTOMER_ROLES.includes(f.signatureRole))
    .map((f) => f.signatureRole!)
    .filter((r) => !signedRoles.has(r))

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0" style={{ fontFamily: brand.font }}>
      <div className="relative mx-auto max-w-3xl bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none overflow-hidden">
        {/* Watermark */}
        {watermark_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={watermark_url} alt="" className="pointer-events-none absolute inset-0 m-auto max-w-[60%] opacity-5" />
        )}

        {/* Branded header */}
        <div className="px-8 py-5 flex items-center gap-4" style={{ backgroundColor: brand.secondary, flexDirection: branding?.logo_position === 'left' ? 'row' : branding?.logo_position === 'center' ? 'column' : 'row-reverse' }}>
          {logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo_url} alt={businessName} className="h-12 object-contain bg-white/95 rounded-md px-2 py-1" />
          ) : null}
          <div className={`flex-1 ${branding?.logo_position === 'center' ? 'text-center' : ''}`}>
            <p className="text-lg font-bold text-white">{businessName}</p>
            <p className="text-xs text-white/70">
              {[business?.abn && `ABN ${business.abn}`, branding?.acn && `ACN ${branding.acn}`, branding?.electrical_license && `Lic ${branding.electrical_license}`, business?.phone]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="relative p-8">
          {/* Document meta */}
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: brand.secondary }}>{doc.template_name}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {job ? `${job.title}${job.customer_address ? ` — ${job.customer_address}` : ''}` : ''}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              {doc.doc_number && <p className="font-mono font-bold text-slate-800">{doc.doc_number}</p>}
              <p>Rev {doc.revision} · {doc.completed_at ? `Issued ${new Date(doc.completed_at).toLocaleDateString('en-AU')}` : `Created ${new Date(doc.created_at).toLocaleDateString('en-AU')}`}</p>
              <p className="capitalize">Status: {doc.status.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Read-only form body */}
          <div className="mt-6">
            <FormRenderer schema={doc.template_schema} data={doc.data} readOnly accentColor={brand.primary} />
          </div>

          {/* Signatures on record */}
          {signatures.length > 0 && (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Signatures</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {signatures.map((s) => (
                  <div key={s.role} className="rounded-lg border border-slate-200 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.signature_data} alt={`${s.role} signature`} className="h-14" />
                    <p className="mt-1 text-sm font-medium text-slate-800">{s.signer_name}</p>
                    <p className="text-xs text-slate-400">{ROLE_LABELS[s.role] ?? s.role} · {new Date(s.signed_at).toLocaleString('en-AU')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div>}
          {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {/* Customer actions */}
          <div className="mt-8 print:hidden space-y-5">
            {/* Outstanding signatures */}
            {outstandingCustomerRoles.length > 0 && !isDecided && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-800">
                  Your signature is required: {outstandingCustomerRoles.map((r) => ROLE_LABELS[r]).join(', ')}
                </p>
                {signingRole ? (
                  <div className="mt-3 rounded-lg bg-white border border-amber-200 p-4">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                    />
                    <SignaturePad onChange={setSignature} />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !name.trim() || !signature}
                        onClick={async () => {
                          const ok = await post({ action: 'sign', role: signingRole, name, signature_data: signature })
                          if (ok) { setMessage('Signature recorded — thank you.'); setSigningRole(null); load() }
                        }}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: brand.primary }}
                      >
                        {busy ? 'Saving…' : 'Save signature'}
                      </button>
                      <button type="button" onClick={() => setSigningRole(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {outstandingCustomerRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => { setSigningRole(role); setName(''); setSignature(null) }}
                        className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                        style={{ backgroundColor: brand.primary }}
                      >
                        Sign as {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Approve / reject */}
            {!isDecided && ['completed', 'awaiting_signature'].includes(doc.status) && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-800 mb-3">Do you accept this work / document?</p>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                />
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Comments (optional)"
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy || !name.trim()}
                    onClick={async () => {
                      const ok = await post({ action: 'approve', name, note })
                      if (ok) { setMessage('Work approved — thank you!'); load() }
                    }}
                    className="flex-1 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: brand.primary }}
                  >
                    Approve work
                  </button>
                  <button
                    type="button"
                    disabled={busy || !name.trim()}
                    onClick={async () => {
                      const ok = await post({ action: 'reject', name, note })
                      if (ok) { setMessage('Response recorded. The business has been notified.'); load() }
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

            {isDecided && (
              <div className={`rounded-xl border p-5 text-center text-sm font-semibold ${doc.status === 'approved' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                {doc.status === 'approved' ? '✓ This work has been approved.' : 'This document was rejected — the business has been notified.'}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: brand.secondary }}
              >
                Download / Print PDF
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>{branding?.footer_text || `Prepared by ${businessName}${business?.website ? ` · ${business.website}` : ''}`}</span>
            <span className="font-mono">Verify: {doc.doc_number ?? '—'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
