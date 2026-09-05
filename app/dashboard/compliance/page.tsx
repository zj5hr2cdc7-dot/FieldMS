'use client'

/**
 * Compliance register.
 *
 * Deliberately framed as revenue, not admin. Every asset overdue for testing
 * is work this business is entitled to bill and has not quoted, so the page
 * leads with what that is worth and groups by customer, in the order you
 * would make the calls.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import {
  listRegister,
  applyDueFilter,
  groupByCustomer,
  pipelineValue,
  formatDue,
  DUE_FILTERS,
  type RegisterRow,
  type DueFilter,
} from '@/lib/assets'
import { formatMoney } from '@/lib/customers'

export default function CompliancePage() {
  const { currentTenant } = useAuthContext()
  const tenantId = currentTenant?.id

  const [rows, setRows] = useState<RegisterRow[]>([])
  const [filter, setFilter] = useState<DueFilter>('overdue')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      setRows(await listRegister(tenantId))
    } catch (err) {
      const e = err as { message?: string; code?: string }
      setError(
        e.code === '42P01'
          ? 'The compliance register does not exist yet. Run migration 025 in the Supabase SQL editor.'
          : e.message ?? 'Could not load the register.'
      )
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { void load() }, [load])

  const filtered = useMemo(() => applyDueFilter(rows, filter), [rows, filter])
  const groups = useMemo(() => groupByCustomer(filtered), [filtered])

  const overdue = useMemo(() => rows.filter((r) => r.is_overdue), [rows])
  const due60 = useMemo(() => applyDueFilter(rows, 'due_60'), [rows])
  const overdueValue = useMemo(() => pipelineValue(overdue), [overdue])
  const due60Value = useMemo(() => pipelineValue(due60), [due60])
  const filteredValue = useMemo(() => pipelineValue(filtered), [filtered])

  if (!tenantId) return null

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-slate-900">Compliance register</h1>
      <p className="mt-1 text-slate-500">
        Every switchboard, RCD and fitting you look after, and when each one is next due.
      </p>

      {/* The revenue framing */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Overdue now</p>
          <p className="mt-1 text-3xl font-black text-amber-900">{overdue.length}</p>
          {overdueValue.total > 0 && (
            <p className="mt-1 text-sm font-semibold text-amber-800">
              {formatMoney(overdueValue.total)} of work
            </p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Due in 60 days</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{due60.length}</p>
          {due60Value.total > 0 && (
            <p className="mt-1 text-sm text-slate-500">{formatMoney(due60Value.total)} of work</p>
          )}
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assets tracked</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{rows.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tests on record</p>
          <p className="mt-1 text-3xl font-black text-slate-900">
            {rows.reduce((n, r) => n + r.tests_recorded, 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">History nobody else can recreate</p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="mt-8 flex flex-wrap gap-2">
        {DUE_FILTERS.map((f) => {
          const count = applyDueFilter(rows, f.key).length
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              title={f.hint}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f.key
                  ? 'border-brand bg-brand text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {f.label}{' '}
              <span className={filter === f.key ? 'text-white/70' : 'text-slate-400'}>{count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 text-sm text-slate-500">
        <span>{DUE_FILTERS.find((f) => f.key === filter)?.hint}</span>
        {filteredValue.total > 0 && (
          <span className="font-semibold text-brand-dark">
            {formatMoney(filteredValue.total)} across {filteredValue.priced} assets
            {filteredValue.unpriced > 0 && ` (${filteredValue.unpriced} without a value set)`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
        </div>
      ) : groups.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="font-semibold text-slate-700">
            {rows.length === 0 ? 'No assets on the register yet' : 'Nothing in this group'}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {rows.length === 0
              ? 'Add the switchboards, RCDs and emergency fittings you look after. Every completed test sheet then attaches to its asset and rolls the next due date forward automatically.'
              : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {groups.map((group) => (
            <div key={group.customerId ?? 'none'} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div>
                  {group.customerId ? (
                    <Link
                      href={`/dashboard/customers/${group.customerId}`}
                      className="text-lg font-bold text-slate-900 hover:text-brand-dark"
                    >
                      {group.customerName}
                    </Link>
                  ) : (
                    <p className="text-lg font-bold text-slate-500">{group.customerName}</p>
                  )}
                  <p className="mt-0.5 text-sm text-slate-500">
                    {group.assets.length} asset{group.assets.length === 1 ? '' : 's'}
                    {group.overdueCount > 0 && (
                      <span className="ml-2 font-semibold text-amber-700">
                        {group.overdueCount} overdue
                      </span>
                    )}
                  </p>
                </div>
                {group.value > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Worth</p>
                    <p className="text-xl font-black text-slate-900">{formatMoney(group.value)}</p>
                  </div>
                )}
              </div>

              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {group.assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/compliance/${a.id}`} className="font-semibold text-slate-900 hover:text-brand-dark">
                          {a.label}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {[a.asset_type_label, a.location_note, a.site_address].filter(Boolean).join(' · ')}
                        </p>
                      </td>
                      <td className="hidden px-6 py-3 text-slate-500 md:table-cell">
                        {a.standard_ref ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {a.tests_recorded > 0 ? `${a.tests_recorded} on record` : 'No tests yet'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={a.is_overdue ? 'font-semibold text-amber-700' : 'text-slate-600'}>
                          {formatDue(a.days_until_due)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-600">
                        {a.typical_test_value ? formatMoney(a.typical_test_value) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs leading-5 text-slate-400">
        Test intervals shown are common Australian defaults and can be overridden per asset. The
        applicable standard and the site classification decide the real figure, so confirm against
        current AS/NZS standards and your state regulations.
      </p>
    </div>
  )
}
