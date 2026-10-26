'use client'

/**
 * Quoted versus actual for one job, as a tab on the existing billing screen.
 *
 * This does NOT replace the Dashboard tab's margin. That one is the quoted
 * position from job_billing_items and it stays exactly as it was. This is the
 * actual position and the gap between the two.
 *
 * Two things it refuses to do, both deliberate:
 *   - call anything "profit" without saying gross, because it knows nothing
 *     about overheads and counts invoiced revenue rather than money received
 *   - show a confident margin when hours are uncosted, because that number
 *     would be flattering and wrong
 */

import { useCallback, useEffect, useState } from 'react'
import {
  addJobCost,
  deleteJobCost,
  getJobCostBreakdown,
  type JobCostBreakdown,
} from '@/lib/job-costing-queries'

const aud = (n: number, dp = 0) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: dp, maximumFractionDigits: dp })

const pct = (n: number) => `${n.toFixed(1)}%`
const hrs = (n: number) => `${n.toLocaleString('en-AU', { maximumFractionDigits: 1 })} hrs`

const COST_KINDS = [
  ['subcontractor', 'Subcontractor'],
  ['plant_hire', 'Plant hire'],
  ['permit', 'Permit'],
  ['disposal', 'Disposal'],
  ['travel', 'Travel'],
  ['other', 'Other'],
] as const

export default function JobProfitability({
  tenantId,
  jobId,
  isOffice,
  canEdit,
}: {
  tenantId: string
  jobId: string
  isOffice: boolean
  canEdit: boolean
}) {
  const [data, setData] = useState<JobCostBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setData(await getJobCostBreakdown(tenantId, jobId, { isOffice }))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load job costs')
    } finally {
      setLoading(false)
    }
  }, [tenantId, jobId, isOffice])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!isOffice) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Job costs and margins are visible to the owner and managers only.
      </p>
    )
  }
  if (loading) return <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
  if (!data) return null

  const d = data
  const marginTone = d.incomplete
    ? 'text-slate-400'
    : d.actualGrossProfit < 0
      ? 'text-red-300'
      : d.belowTarget
        ? 'text-amber-300'
        : 'text-white'

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-ink p-5 text-white shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
            Actual gross profit
          </p>
          <p className={`mt-1 text-4xl font-black ${marginTone}`}>
            {d.incomplete ? '—' : aud(d.actualGrossProfit)}
            {!d.incomplete && (
              <span className="ml-2 text-lg font-semibold text-white/60">{pct(d.actualMarginPercent)}</span>
            )}
          </p>
          <p className="mt-1 text-sm text-white/60">
            {d.incomplete
              ? 'Not calculated yet: see what is missing below'
              : 'Revenue less direct job costs. Not net profit, and not cash.'}
          </p>
          {d.belowTarget && (
            <p className="mt-3 inline-block rounded-md bg-amber-400/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
              Below your target margin
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quoted gross profit</p>
          <p className="mt-1 text-2xl font-black text-slate-900">
            {d.quotedRevenueExGst > 0 ? aud(d.quotedGrossProfit) : '—'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {d.quotedRevenueExGst > 0 ? pct(d.quotedMarginPercent) : 'No baseline captured'}
          </p>
        </div>
      </div>

      {/* Quoted vs actual */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-semibold">Quoted vs actual</th>
              <th className="px-5 py-3 text-right font-semibold">Quoted</th>
              <th className="px-5 py-3 text-right font-semibold">Actual</th>
              <th className="px-5 py-3 text-right font-semibold">Variance</th>
            </tr>
          </thead>
          <tbody>
            {/*
              The three cost lines show actuals only. A baseline records one
              quoted labour figure and one quoted material figure, but the
              split is not reliable enough per-line to invite a comparison
              that looks precise and is not. The comparison happens on Total
              cost, where both sides are real.
            */}
            <LineRow label="Labour cost" actual={d.actualLabourCost} hideQuoted />
            <LineRow label="Material cost" actual={d.actualMaterialCost} hideQuoted />
            <LineRow label="Other direct costs" actual={d.actualOtherCost} hideQuoted />
            <LineRow label="Total cost" quoted={d.quotedCost} actual={d.actualCost} strong />
            <LineRow label="Hours" quoted={d.quotedHours} actual={d.actualHours} unit="hours" />
            <LineRow label="Revenue ex GST" quoted={d.quotedRevenueExGst} actual={d.recognisedRevenueExGst} />
          </tbody>
        </table>
      </div>

      {/* Where the revenue sits */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Mini label="Invoiced" value={aud(d.invoicedRevenueExGst)} note="ex GST" />
        <Mini
          label="Done, not invoiced"
          value={aud(d.unbilledRevenueExGst)}
          note={d.unbilledRevenueExGst > 0 ? 'Invoice this' : 'Nothing outstanding'}
          tone={d.unbilledRevenueExGst > 0 ? 'amber' : undefined}
        />
        <Mini
          label="Material price variance"
          value={aud(d.materialPriceVariance)}
          note={d.materialPriceVariance > 0 ? 'Suppliers billed above the PO' : 'No variance recorded'}
          tone={d.materialPriceVariance > 0 ? 'red' : undefined}
        />
      </div>

      {/* What the number rests on */}
      {d.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
            What this figure rests on
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-amber-900">
            {d.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Other direct costs */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Other direct costs</h3>
            <p className="text-xs text-slate-500">
              Subcontractors, plant hire, permits, disposal. Labour and materials come from timesheets and billing lines.
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowAdd((s) => !s)}
              className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              {showAdd ? 'Cancel' : 'Add cost'}
            </button>
          )}
        </div>

        {showAdd && canEdit && (
          <AddCostForm
            tenantId={tenantId}
            jobId={jobId}
            onDone={async () => {
              setShowAdd(false)
              await refresh()
            }}
            onError={setError}
          />
        )}

        {d.otherCostLines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">Nothing recorded against this job yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {d.otherCostLines.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{c.description}</p>
                  <p className="text-xs text-slate-500">
                    {COST_KINDS.find(([k]) => k === c.kind)?.[1] ?? c.kind}
                    {c.supplierName ? ` · ${c.supplierName}` : ''} · {c.incurredOn}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{aud(c.amountExGst, 2)}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await deleteJobCost(tenantId, c.id)
                          await refresh()
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'Could not remove that cost')
                        }
                      }}
                      className="text-xs text-slate-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-400">
        Gross profit is revenue less direct job costs. It does not include business overheads, so it is not net profit,
        and it counts invoiced work rather than money received, so it is not cash in the bank.
      </p>
    </div>
  )
}

/* ── small pieces ─────────────────────────────────────────── */

function LineRow({
  label,
  quoted,
  actual,
  unit,
  strong,
  hideQuoted,
}: {
  label: string
  quoted?: number | null
  actual: number
  unit?: 'hours'
  strong?: boolean
  hideQuoted?: boolean
}) {
  const fmt = (n: number) => (unit === 'hours' ? hrs(n) : aud(n, 2))
  const hasQuote = !hideQuoted && quoted != null && quoted !== 0
  const variance = hasQuote ? actual - (quoted as number) : null
  return (
    <tr className={`border-b border-slate-100 last:border-0 ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
      <td className="px-5 py-2.5">{label}</td>
      <td className="px-5 py-2.5 text-right tabular-nums">{hasQuote ? fmt(quoted as number) : '—'}</td>
      <td className="px-5 py-2.5 text-right tabular-nums">{fmt(actual)}</td>
      <td
        className={`px-5 py-2.5 text-right tabular-nums ${
          variance == null ? 'text-slate-300' : variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-700' : 'text-slate-400'
        }`}
      >
        {variance == null ? '—' : `${variance > 0 ? '+' : ''}${fmt(variance)}`}
      </td>
    </tr>
  )
}

function Mini({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'amber' | 'red' }) {
  const toneCls = tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-600' : 'text-slate-500'
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className={`mt-0.5 text-xs ${toneCls}`}>{note}</p>
    </div>
  )
}

function AddCostForm({
  tenantId,
  jobId,
  onDone,
  onError,
}: {
  tenantId: string
  jobId: string
  onDone: () => Promise<void>
  onError: (m: string) => void
}) {
  const [kind, setKind] = useState<string>('subcontractor')
  const [description, setDescription] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  const amountNum = Number(amount)
  const valid = description.trim().length > 0 && Number.isFinite(amountNum) && amountNum > 0

  const cls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Type</span>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={cls}>
          {COST_KINDS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Amount ex GST</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={cls}
          placeholder="0.00"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Description</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className={cls} placeholder="Trenching, 2 days" />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">Supplier (optional)</span>
        <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={cls} />
      </label>
      <div className="sm:col-span-2">
        <button
          type="button"
          disabled={!valid || saving}
          onClick={async () => {
            setSaving(true)
            try {
              await addJobCost({
                tenantId,
                jobId,
                kind,
                description: description.trim(),
                supplierName: supplierName.trim() || null,
                amountExGst: amountNum,
              })
              await onDone()
            } catch (e) {
              onError(e instanceof Error ? e.message : 'Could not save that cost')
            } finally {
              setSaving(false)
            }
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save cost'}
        </button>
      </div>
    </div>
  )
}
