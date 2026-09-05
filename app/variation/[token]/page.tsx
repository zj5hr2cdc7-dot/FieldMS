'use client'

import { use, useEffect, useState } from 'react'

interface VariationData {
  variation: {
    variation_number: number
    description: string
    reason: string | null
    total_ex_gst: number
    gst_amount: number
    total_inc_gst: number
    status: string
    approved_by_name: string | null
    created_at: string
  }
  job: { title: string; customer_name: string | null; customer_address: string | null } | null
  business: { name: string; abn: string | null; phone: string | null } | null
  branding: { trading_name: string | null; primary_color: string; secondary_color: string; font_family: string; footer_text: string | null } | null
  logo_url: string | null
}

const money = (n: number) => `A$${n.toFixed(2)}`

export default function PublicVariationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<VariationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)

  const load = () => {
    fetch(`/api/variations/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Variation not found or link expired.'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }
  useEffect(load, [token])

  if (error && !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4"><p className="text-slate-500">{error}</p></div>
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Loading variation…</p></div>

  const { variation: v, job, business, branding, logo_url } = data
  const brand = { primary: branding?.primary_color ?? '#4a9c4a', secondary: branding?.secondary_color ?? '#1a2332', font: branding?.font_family ?? 'Inter' }
  const businessName = branding?.trading_name || business?.name || ''
  const decided = result ?? (['approved', 'rejected', 'completed'].includes(v.status) ? (v.status === 'rejected' ? 'rejected' : 'approved') : null)

  const respond = async (action: 'approve' | 'reject') => {
    setBusy(true); setError(null)
    try {
      const res = await fetch(`/api/variations/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, name }) })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Something went wrong.')
      setResult(action === 'approve' ? 'approved' : 'rejected')
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong.') } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4" style={{ fontFamily: brand.font }}>
      <div className="mx-auto max-w-2xl bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-8 py-5 flex items-center justify-between" style={{ backgroundColor: brand.secondary }}>
          <div className="flex items-center gap-3">
            {logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo_url} alt={businessName} className="h-11 bg-white/95 rounded-md px-2 py-1 object-contain" />
            )}
            <p className="text-lg font-bold text-white">{businessName}</p>
          </div>
          <p className="text-sm text-white/80 uppercase tracking-wide">Variation #{v.variation_number}</p>
        </div>

        <div className="p-8">
          <p className="text-xs uppercase tracking-wide text-slate-400">Job</p>
          <p className="font-semibold text-slate-900">{job?.title}</p>
          <p className="text-sm text-slate-500">{job?.customer_name}{job?.customer_address ? ` · ${job.customer_address}` : ''}</p>

          <div className="mt-5 rounded-lg border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-800">{v.description}</p>
            {v.reason && <p className="mt-1 text-sm text-slate-500">Reason: {v.reason}</p>}
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between text-slate-600"><span>Variation (ex GST)</span><span>{money(v.total_ex_gst)}</span></div>
              <div className="flex justify-between text-slate-600"><span>GST</span><span>{money(v.gst_amount)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><span>Total (inc GST)</span><span>{money(v.total_inc_gst)}</span></div>
            </div>
          </div>

          <div className="mt-6">
            {decided === 'approved' ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center text-sm font-semibold text-green-800">
                ✓ Variation approved{v.approved_by_name ? ` by ${v.approved_by_name}` : ''}. This has been added to your job.
              </div>
            ) : decided === 'rejected' ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">
                Variation declined. {businessName} has been notified.
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Type your full name to approve" className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none" />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button type="button" disabled={busy || !name.trim()} onClick={() => respond('approve')} className="flex-1 rounded-lg px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: brand.primary }}>
                    {busy ? 'Submitting…' : `Approve — ${money(v.total_inc_gst)}`}
                  </button>
                  <button type="button" disabled={busy || !name.trim()} onClick={() => respond('reject')} className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                    Decline
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-slate-400">Approving adds this variation to your job total.</p>
              </>
            )}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400 text-center">
            {branding?.footer_text || businessName}
          </div>
        </div>
      </div>
    </div>
  )
}
