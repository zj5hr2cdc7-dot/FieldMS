'use client'

import { use, useEffect, useState } from 'react'

interface QuoteData {
  quote: {
    customer_name: string
    status: string
    total: number
    deposit_percent: number
    deposit_amount: number
    approved_at: string | null
    declined_at: string | null
    approval_name: string | null
    created_at: string
    items: { id: string; name: string; quantity: number; unit_price: number; total: number }[]
  }
  business: { name: string; logo_url: string | null; abn: string | null; phone: string | null; website: string | null } | null
}

function currency(value: number) {
  return `A$${value.toFixed(2)}`
}

export default function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<QuoteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'approved' | 'declined' | null>(null)

  useEffect(() => {
    fetch(`/api/quotes/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Quote not found or link has expired.'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  const respond = async (action: 'approve' | 'decline') => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/quotes/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, note }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Something went wrong.')
      setResult(action === 'approve' ? 'approved' : 'declined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-slate-500">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading quote…</p>
      </div>
    )
  }

  const { quote, business } = data
  const alreadyResponded = Boolean(quote.approved_at || quote.declined_at)
  const isApproved = result === 'approved' || Boolean(quote.approved_at)
  const isDeclined = result === 'declined' || Boolean(quote.declined_at)

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="mx-auto max-w-2xl">
        {/* Business header */}
        <div className="rounded-t-xl bg-white border border-slate-200 border-b-0 p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Quote for</p>
              <h1 className="text-2xl font-bold text-slate-900">{quote.customer_name}</h1>
            </div>
            <div className="text-right">
              <p className="font-semibold text-slate-900">{business?.name}</p>
              {business?.abn && <p className="text-xs text-slate-500">ABN {business.abn}</p>}
              {business?.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-200 border-b-0 px-6 sm:px-8">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="py-3 pr-3">Item</th>
                <th className="py-3 pr-3 text-right">Qty</th>
                <th className="py-3 pr-3 text-right">Unit</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-3 text-slate-900">{item.name}</td>
                  <td className="py-3 pr-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-3 pr-3 text-right text-slate-600">{currency(item.unit_price)}</td>
                  <td className="py-3 text-right font-medium text-slate-900">{currency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-slate-50 border border-slate-200 px-6 sm:px-8 py-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Total (inc. GST)</p>
            <p className="text-3xl font-bold text-slate-900">{currency(quote.total)}</p>
          </div>
          {quote.deposit_percent > 0 && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <p className="text-slate-500">Deposit to secure booking ({quote.deposit_percent}%)</p>
              <p className="font-semibold text-slate-700">{currency(quote.deposit_amount)}</p>
            </div>
          )}
        </div>

        {/* Action area */}
        <div className="rounded-b-xl bg-white border border-slate-200 border-t-0 p-6 sm:p-8">
          {isApproved ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-5 text-center">
              <p className="text-lg font-semibold text-green-800">✓ Quote approved</p>
              <p className="mt-1 text-sm text-green-700">
                {quote.approval_name ? `Approved by ${quote.approval_name}. ` : ''}
                {business?.name} will be in touch to schedule the work.
                {quote.deposit_percent > 0 && ` A deposit of ${currency(quote.deposit_amount)} will be requested to confirm your booking.`}
              </p>
            </div>
          ) : isDeclined ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-5 text-center">
              <p className="text-lg font-semibold text-slate-700">Quote declined</p>
              <p className="mt-1 text-sm text-slate-500">Thanks for letting us know. Reply to our original message if anything changes.</p>
            </div>
          ) : alreadyResponded ? null : (
            <>
              <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Type your full name to approve"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
              <label className="mt-3 block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Any questions or comments"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => respond('approve')}
                  className="flex-1 rounded-lg bg-brand px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Sending…' : `Approve quote — ${currency(quote.total)}`}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => respond('decline')}
                  className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Typing your name and approving acts as your acceptance of this quote.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
