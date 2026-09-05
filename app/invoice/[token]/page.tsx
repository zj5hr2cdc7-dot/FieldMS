'use client'

import { use, useEffect, useState } from 'react'

interface InvoiceData {
  invoice: {
    invoice_number: string
    kind: string
    status: string
    subtotal_ex_gst: number
    gst_amount: number
    total_inc_gst: number
    discount: number
    amount_paid: number
    due_date: string | null
    issued_at: string | null
    notes: string | null
    items: { description: string; quantity: number; unit_price: number; amount: number }[]
  }
  job: { title: string; customer_name: string | null; customer_address: string | null; po_number: string | null } | null
  business: { name: string; abn: string | null; phone: string | null; website: string | null } | null
  branding: {
    trading_name: string | null; electrical_license: string | null; business_address: string | null
    primary_color: string; secondary_color: string; accent_color: string; font_family: string
    footer_text: string | null; acn: string | null
  } | null
  logo_url: string | null
}

const money = (n: number) => `A$${n.toFixed(2)}`

export default function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<InvoiceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch(`/api/invoices/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Invoice not found or link expired.'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error && !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4"><p className="text-slate-500">{error}</p></div>
  if (!data) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Loading invoice…</p></div>

  const { invoice: inv, job, business, branding, logo_url } = data
  const brand = { primary: branding?.primary_color ?? '#4a9c4a', secondary: branding?.secondary_color ?? '#1a2332', font: branding?.font_family ?? 'Inter' }
  const businessName = branding?.trading_name || business?.name || ''
  const balance = Math.max(0, inv.total_inc_gst - inv.amount_paid)
  const isPaid = inv.status === 'paid'
  const kindLabel = inv.kind === 'tax' ? 'Tax Invoice' : `${inv.kind.charAt(0).toUpperCase()}${inv.kind.slice(1)} Invoice`

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0" style={{ fontFamily: brand.font }}>
      <div className="mx-auto max-w-3xl bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none overflow-hidden">
        {/* Header */}
        <div className="px-8 py-5 flex items-center justify-between" style={{ backgroundColor: brand.secondary }}>
          <div className="flex items-center gap-3">
            {logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo_url} alt={businessName} className="h-11 bg-white/95 rounded-md px-2 py-1 object-contain" />
            )}
            <div>
              <p className="text-lg font-bold text-white">{businessName}</p>
              <p className="text-xs text-white/70">
                {[business?.abn && `ABN ${business.abn}`, branding?.electrical_license && `Lic ${branding.electrical_license}`, business?.phone].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="text-right text-white">
            <p className="text-sm uppercase tracking-wide opacity-80">{kindLabel}</p>
            <p className="font-mono font-bold">{inv.invoice_number}</p>
          </div>
        </div>

        <div className="p-8">
          {/* Bill to + meta */}
          <div className="flex flex-wrap justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Bill to</p>
              <p className="mt-1 font-semibold text-slate-900">{job?.customer_name}</p>
              <p className="text-sm text-slate-500">{job?.customer_address}</p>
              {job?.po_number && <p className="text-xs text-slate-400 mt-0.5">PO {job.po_number}</p>}
            </div>
            <div className="text-right text-sm">
              {inv.issued_at && <p className="text-slate-500">Issued: {new Date(inv.issued_at).toLocaleDateString('en-AU')}</p>}
              {inv.due_date && <p className="text-slate-500">Due: {new Date(inv.due_date).toLocaleDateString('en-AU')}</p>}
              <p className="mt-1 font-semibold capitalize" style={{ color: isPaid ? brand.primary : brand.secondary }}>{inv.status.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full text-left text-sm mt-5">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3 text-right">Qty</th>
                <th className="py-2 pr-3 text-right">Unit</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2.5 pr-3 text-slate-900">{it.description}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{it.quantity}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-600">{money(it.unit_price)}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{money(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-5 ml-auto max-w-xs space-y-1.5 text-sm">
            {inv.discount > 0 && <Row label="Discount" value={`-${money(inv.discount)}`} />}
            <Row label="Subtotal (ex GST)" value={money(inv.subtotal_ex_gst)} />
            <Row label="GST" value={money(inv.gst_amount)} />
            <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
              <span>Total (inc GST)</span><span>{money(inv.total_inc_gst)}</span>
            </div>
            {inv.amount_paid > 0 && <Row label="Paid" value={`-${money(inv.amount_paid)}`} />}
            {balance > 0 && (
              <div className="flex items-center justify-between text-base font-bold" style={{ color: brand.secondary }}>
                <span>Balance due</span><span>{money(balance)}</span>
              </div>
            )}
          </div>

          {inv.notes && <p className="mt-6 text-sm text-slate-600 whitespace-pre-wrap border-t border-slate-100 pt-4">{inv.notes}</p>}

          {/* Approve + print */}
          <div className="mt-8 print:hidden">
            {isPaid ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center text-sm font-semibold text-green-800">
                ✓ This invoice has been paid in full. Thank you.
              </div>
            ) : approved ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-5 text-center text-sm font-semibold text-green-800">
                ✓ Invoice acknowledged. {businessName} will confirm payment on receipt.
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-800 mb-2">Acknowledge this invoice</p>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none" />
                <button
                  type="button"
                  disabled={busy || !name.trim()}
                  onClick={async () => {
                    setBusy(true); setError(null)
                    try {
                      const res = await fetch(`/api/invoices/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve', name }) })
                      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
                      setApproved(true)
                    } catch (err) { setError(err instanceof Error ? err.message : 'Failed') } finally { setBusy(false) }
                  }}
                  className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: brand.primary }}
                >
                  {busy ? 'Submitting…' : 'Acknowledge invoice'}
                </button>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => window.print()} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: brand.secondary }}>
                Download / Print PDF
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-400 flex items-center justify-between">
            <span>{branding?.footer_text || `${businessName}${business?.website ? ` · ${business.website}` : ''}`}</span>
            <span className="font-mono">{inv.invoice_number}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-slate-600"><span>{label}</span><span>{value}</span></div>
}
