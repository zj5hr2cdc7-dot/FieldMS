'use client'

/**
 * Customers.
 *
 * The customer record that the app was missing. Two tabs: the list of
 * everyone, and the marketing list with segments and CSV export.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import {
  listCustomers,
  listMarketingCustomers,
  applySegment,
  markMarketed,
  toCsv,
  formatMoney,
  formatWhen,
  SEGMENTS,
  CUSTOMER_KINDS,
  type Customer,
  type MarketingRow,
  type Segment,
} from '@/lib/customers'

type Tab = 'list' | 'marketing'

export default function CustomersPage() {
  const { currentTenant } = useAuthContext()
  const tenantId = currentTenant?.id

  const [tab, setTab] = useState<Tab>('list')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [marketing, setMarketing] = useState<MarketingRow[]>([])
  const [segment, setSegment] = useState<Segment>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exported, setExported] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [c, m] = await Promise.all([listCustomers(tenantId), listMarketingCustomers(tenantId)])
      setCustomers(c)
      setMarketing(m)
    } catch (err) {
      const e = err as { message?: string; code?: string }
      setError(
        e.code === '42P01'
          ? 'The customers tables do not exist yet. Run migration 023 in the Supabase SQL editor.'
          : e.message ?? 'Could not load customers.'
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return customers
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.email ?? '').toLowerCase().includes(term) ||
        (c.phone ?? '').toLowerCase().includes(term)
    )
  }, [customers, search])

  const segmented = useMemo(() => applySegment(marketing, segment), [marketing, segment])

  const totalValue = useMemo(
    () => marketing.reduce((sum, r) => sum + r.lifetime_value, 0),
    [marketing]
  )
  const lapsedCount = useMemo(() => marketing.filter((r) => r.is_lapsed).length, [marketing])

  const handleExport = async () => {
    if (!segmented.length) return
    const csv = toCsv(segmented, window.location.origin)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `customers-${segment}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    try {
      await markMarketed(segmented.map((r) => r.id))
      setExported(segmented.length)
      await load()
    } catch {
      setExported(segmented.length)
    }
  }

  if (!tenantId) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Customers</h1>
          <p className="mt-1 text-slate-500">
            Everyone you have worked for, their history, and who is worth contacting again.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Customers', String(customers.length)],
          ['Contactable', String(marketing.length)],
          ['Lapsed over a year', String(lapsedCount)],
          ['Lifetime invoiced', formatMoney(totalValue)],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-8 flex gap-1 border-b border-slate-200">
        {([
          ['list', `All customers (${customers.length})`],
          ['marketing', `Marketing list (${marketing.length})`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-brand text-brand-dark'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
        </div>
      ) : tab === 'list' ? (
        /* ── All customers ── */
        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or phone"
            className="input max-w-sm"
          />

          {filtered.length === 0 ? (
            <div className="card mt-6 p-12 text-center">
              <p className="font-semibold text-slate-700">
                {customers.length === 0 ? 'No customers yet' : 'Nothing matches that search'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {customers.length === 0
                  ? 'Customers are created automatically from your jobs. Run migration 023 to backfill the ones you already have.'
                  : 'Try a shorter search term.'}
              </p>
            </div>
          ) : (
            <div className="card mt-6 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="hidden px-5 py-3 font-semibold sm:table-cell">Contact</th>
                    <th className="px-5 py-3 font-semibold">Marketing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/customers/${c.id}`} className="font-semibold text-slate-900 hover:text-brand-dark">
                          {c.name}
                        </Link>
                        {c.billing_address && (
                          <p className="mt-0.5 text-xs text-slate-400">{c.billing_address}</p>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {CUSTOMER_KINDS.find((k) => k.key === c.kind)?.label ?? c.kind}
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 sm:table-cell">
                        {c.email ?? c.phone ?? <span className="text-slate-300">None</span>}
                      </td>
                      <td className="px-5 py-3">
                        <ConsentBadge consent={c.marketing_consent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ── Marketing list ── */
        <div className="mt-6">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
            <p className="font-semibold">Before you send anything</p>
            <p className="mt-1">
              Under the Australian Spam Act you need consent and a working unsubscribe link in every
              message. Past customers count as implied consent, which is lawful but weaker than express
              consent. The export includes a unique unsubscribe URL for each person: put it in your email
              footer and opt outs come back here automatically.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {SEGMENTS.map((s) => {
              const count = applySegment(marketing, s.key).length
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => { setSegment(s.key); setExported(null) }}
                  title={s.hint}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    segment === s.key
                      ? 'border-brand bg-brand text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {s.label} <span className={segment === s.key ? 'text-white/70' : 'text-slate-400'}>{count}</span>
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-sm text-slate-500">
            {SEGMENTS.find((s) => s.key === segment)?.hint}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={!segmented.length}
              className="btn btn-primary disabled:opacity-40"
            >
              Export {segmented.length} to CSV
            </button>
            {exported !== null && (
              <span className="text-sm text-brand-dark">
                Exported {exported} contacts and marked them as emailed.
              </span>
            )}
          </div>

          {segmented.length === 0 ? (
            <div className="card mt-6 p-12 text-center">
              <p className="font-semibold text-slate-700">Nobody in this segment</p>
              <p className="mt-1 text-sm text-slate-500">
                Customers appear here once they have an email address and have not opted out.
              </p>
            </div>
          ) : (
            <div className="card mt-6 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">Email</th>
                    <th className="px-5 py-3 text-right font-semibold">Jobs</th>
                    <th className="px-5 py-3 text-right font-semibold">Lifetime</th>
                    <th className="px-5 py-3 font-semibold">Last job</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {segmented.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/customers/${r.id}`} className="font-semibold text-slate-900 hover:text-brand-dark">
                          {r.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400 md:hidden">{r.email}</p>
                      </td>
                      <td className="hidden px-5 py-3 text-slate-500 md:table-cell">{r.email}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{r.job_count}</td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {formatMoney(r.lifetime_value)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={r.is_lapsed ? 'text-amber-700' : 'text-slate-500'}>
                          {formatWhen(r.last_job_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ConsentBadge({ consent }: { consent: Customer['marketing_consent'] }) {
  const styles: Record<string, string> = {
    express: 'bg-green-50 text-green-700',
    implied: 'bg-slate-100 text-slate-600',
    declined: 'bg-amber-50 text-amber-700',
    unsubscribed: 'bg-red-50 text-red-700',
  }
  const labels: Record<string, string> = {
    express: 'Opted in',
    implied: 'Past customer',
    declined: 'Declined',
    unsubscribed: 'Unsubscribed',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[consent]}`}>
      {labels[consent]}
    </span>
  )
}
