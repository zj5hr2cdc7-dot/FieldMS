'use client'

/**
 * One customer: their details, sites, job history and marketing consent.
 *
 * This is the view that was impossible before customers existed. A tech or
 * office staffer can now see what was done for this person last time rather
 * than searching jobs for a remembered name.
 */

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getCustomer,
  listSites,
  listCustomerJobs,
  setMarketingConsent,
  upsertCustomer,
  formatMoney,
  formatWhen,
  CUSTOMER_KINDS,
  type Customer,
  type Site,
  type CustomerJob,
  type MarketingConsent,
} from '@/lib/customers'

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-sky-50 text-sky-700',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-700',
}

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const customerId = params?.id

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [jobs, setJobs] = useState<CustomerJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!customerId) return
    setLoading(true)
    try {
      const c = await getCustomer(customerId)
      setCustomer(c)
      if (c) {
        const [s, j] = await Promise.all([listSites(c.id), listCustomerJobs(c.id)])
        setSites(s)
        setJobs(j)
      }
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Could not load this customer.')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { void load() }, [load])

  const changeConsent = async (consent: MarketingConsent) => {
    if (!customer) return
    setSaving(true)
    try {
      await setMarketingConsent(customer.id, consent, 'manual')
      await load()
    } catch (err) {
      setError((err as { message?: string }).message ?? 'Could not update consent.')
    } finally {
      setSaving(false)
    }
  }

  const changeKind = async (kind: Customer['kind']) => {
    if (!customer) return
    setSaving(true)
    try {
      await upsertCustomer(customer.tenant_id, { id: customer.id, name: customer.name, kind })
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="font-semibold text-slate-700">Customer not found</p>
        <button type="button" onClick={() => router.push('/dashboard/customers')} className="btn btn-primary mt-6">
          Back to customers
        </button>
      </div>
    )
  }

  const lifetime = jobs.reduce((sum, j) => sum + Number(j.quote_total ?? 0), 0)
  const lastJob = jobs[0]?.created_at ?? null

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/dashboard/customers" className="text-sm font-semibold text-slate-500 hover:text-slate-700">
        ← Customers
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{customer.name}</h1>
          <p className="mt-1 text-slate-500">
            {[customer.email, customer.phone].filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </div>
        <select
          value={customer.kind}
          onChange={(e) => changeKind(e.target.value as Customer['kind'])}
          disabled={saving}
          className="input max-w-[200px]"
        >
          {CUSTOMER_KINDS.map((k) => (
            <option key={k.key} value={k.key}>{k.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Jobs', String(jobs.length)],
          ['Quoted value', formatMoney(lifetime)],
          ['Last job', formatWhen(lastJob)],
          ['Sites', String(sites.length)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Marketing consent */}
      <div className="card mt-8 p-6">
        <h2 className="text-lg font-bold text-slate-900">Email marketing</h2>
        <p className="mt-1 text-sm text-slate-500">
          Only customers set to opted in or past customer appear in the marketing list.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            ['express', 'Opted in'],
            ['implied', 'Past customer'],
            ['declined', 'Do not contact'],
            ['unsubscribed', 'Unsubscribed'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              disabled={saving}
              onClick={() => changeConsent(key)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                customer.marketing_consent === key
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {customer.marketing_consent_at && (
          <p className="mt-3 text-xs text-slate-400">
            Set {formatWhen(customer.marketing_consent_at).toLowerCase()}
            {customer.marketing_consent_source ? ` via ${customer.marketing_consent_source}` : ''}
            {customer.last_marketed_at ? ` · last emailed ${formatWhen(customer.last_marketed_at).toLowerCase()}` : ''}
          </p>
        )}
      </div>

      {/* Sites */}
      {sites.length > 0 && (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-bold text-slate-900">Sites</h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {sites.map((s) => (
              <li key={s.id} className="py-3">
                <p className="font-semibold text-slate-800">{s.label ?? s.address}</p>
                {s.label && <p className="text-sm text-slate-500">{s.address}</p>}
                {s.access_notes && <p className="mt-1 text-sm text-slate-500">Access: {s.access_notes}</p>}
                {s.switchboard_location && (
                  <p className="mt-0.5 text-sm text-slate-500">Switchboard: {s.switchboard_location}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Job history */}
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Job history</h2>
          <p className="mt-0.5 text-sm text-slate-500">What you have done for this customer, newest first.</p>
        </div>
        {jobs.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">No jobs recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <Link href={`/dashboard/jobs/${j.id}`} className="font-semibold text-slate-900 hover:text-brand-dark">
                      {j.title}
                    </Link>
                    {j.customer_address && <p className="mt-0.5 text-xs text-slate-400">{j.customer_address}</p>}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[j.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {j.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                    {Number(j.quote_total) > 0 ? formatMoney(Number(j.quote_total)) : '—'}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-500">{formatWhen(j.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
