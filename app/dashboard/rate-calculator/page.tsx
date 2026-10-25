'use client'

/**
 * Charge-out rate calculator. Works out the hourly rate that covers wages,
 * on-costs, overheads and a profit margin, given how many paid hours actually
 * get billed. The owner can save the answer as the business's default labour
 * rate, which then prefills labour lines (packages, billing).
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getTenant, updateTenant } from '@/lib/auth'
import { can } from '@/lib/roles'
import {
  calculateRate,
  DEFAULT_RATE_INPUTS,
  OVERHEAD_PROMPTS,
  parseRateInputs,
  type RateInputs,
} from '@/lib/rate-calculator'

const aud = (n: number, dp = 0) =>
  n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: dp, maximumFractionDigits: dp })

const FIELDS: { key: keyof RateInputs; label: string; hint: string; prefix?: string; suffix?: string; step?: number }[] = [
  { key: 'billableStaff', label: 'People on the tools', hint: 'Including you, if you bill your own time', step: 1 },
  { key: 'hourlyWage', label: 'Average hourly wage', hint: 'What you pay each of them, before super', prefix: '$', step: 0.5 },
  { key: 'onCostPercent', label: 'On-costs', hint: 'Super (12%), workers comp, payroll tax, leave loading', suffix: '%', step: 1 },
  { key: 'hoursPerWeek', label: 'Paid hours per week', hint: 'Per person', step: 1 },
  { key: 'weeksPerYear', label: 'Working weeks per year', hint: 'After leave, public holidays and sick days', step: 1 },
  { key: 'billablePercent', label: 'Billable share of paid time', hint: 'Travel, quoting, pickups and admin aren’t billed', suffix: '%', step: 1 },
  { key: 'annualOverheads', label: 'Annual overheads', hint: 'Everything that isn’t wages or materials', prefix: '$', step: 500 },
  { key: 'ownerSalary', label: 'Owner salary not counted above', hint: 'If you don’t bill your own time, pay yourself here', prefix: '$', step: 1000 },
  { key: 'profitMarginPercent', label: 'Profit margin', hint: 'Share of the price kept as profit', suffix: '%', step: 1 },
]

export default function RateCalculatorPage() {
  const { currentTenant, userRole } = useAuthContext()
  const owner = can(userRole, 'manageSettings')
  const [inputs, setInputs] = useState<RateInputs>(DEFAULT_RATE_INPUTS)
  const [savedRate, setSavedRate] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    getTenant(currentTenant.id)
      .then((t) => {
        if (!t) return
        if (t.rate_calculator) setInputs(parseRateInputs(t.rate_calculator))
        setSavedRate(t.default_labour_rate != null ? Number(t.default_labour_rate) : null)
      })
      .catch(() => {})
  }, [currentTenant])

  const r = useMemo(() => calculateRate(inputs), [inputs])

  const set = (k: keyof RateInputs, v: string) => setInputs((p) => ({ ...p, [k]: v === '' ? 0 : Number(v) }))

  const save = async () => {
    if (!currentTenant) return
    setSaving(true)
    try {
      const t = await updateTenant(currentTenant.id, {
        default_labour_rate: r.suggestedRate,
        rate_calculator: { ...inputs },
      })
      setSavedRate(t.default_labour_rate != null ? Number(t.default_labour_rate) : r.suggestedRate)
      setMsg({ ok: true, text: `Saved. New labour lines will start at ${aud(r.suggestedRate)}/hr.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
      window.setTimeout(() => setMsg(null), 4000)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Charge-out rate calculator</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          What you need to charge per hour to cover wages, on-costs and overheads, and still make a profit. All figures
          ex GST.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Inputs */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-sm font-semibold text-slate-700">{f.label}</span>
                <span className="mb-1 block text-xs text-slate-400">{f.hint}</span>
                <div className="flex items-center gap-2">
                  {f.prefix && <span className="text-sm text-slate-400">{f.prefix}</span>}
                  <input type="number" min={0} step={f.step ?? 1} value={inputs[f.key]} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
                  {f.suffix && <span className="text-sm text-slate-400">{f.suffix}</span>}
                </div>
              </label>
            ))}
          </div>

          <details className="mt-5 group">
            <summary className="cursor-pointer list-none text-xs font-medium text-slate-500 hover:text-slate-700">
              What counts as an overhead? ›
            </summary>
            <ul className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
              {OVERHEAD_PROMPTS.map((o) => <li key={o}>• {o}</li>)}
            </ul>
          </details>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="rounded-xl bg-ink p-6 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Charge at least</p>
            <p className="mt-1 text-5xl font-black">{aud(r.suggestedRate)}<span className="text-xl font-semibold text-white/60">/hr</span></p>
            <p className="mt-1 text-sm text-white/70">ex GST · {aud(r.suggestedRate * 1.1)}/hr inc GST</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-white/50">Break-even</p>
                <p className="font-semibold">{aud(r.breakEvenRate, 2)}/hr</p>
              </div>
              <div>
                <p className="text-white/50">Overhead in each hour</p>
                <p className="font-semibold">{aud(r.overheadPerBillableHour, 2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
            <dl className="space-y-2">
              {[
                ['Paid hours a year', Math.round(r.paidHoursPerYear).toLocaleString('en-AU')],
                ['Billable hours a year', Math.round(r.billableHoursPerYear).toLocaleString('en-AU')],
                ['Wages + on-costs', aud(r.labourCostPerYear)],
                ['Total costs a year', aud(r.totalCostPerYear)],
                ['Labour revenue at this rate', aud(r.revenuePerYear)],
                ['Profit a year', aud(r.profitPerYear)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-400">Materials are priced separately with their own markup, so they’re left out here.</p>
          </div>

          {r.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <ul className="space-y-1.5 text-sm text-amber-900">
                {r.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          {owner ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">
                Current default labour rate:{' '}
                <strong className="text-slate-900">{savedRate != null ? `${aud(savedRate)}/hr` : 'not set'}</strong>
              </p>
              <button type="button" onClick={save} disabled={saving || r.suggestedRate <= 0}
                className="mt-3 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
                {saving ? 'Saving…' : `Use ${aud(r.suggestedRate)}/hr as my default rate`}
              </button>
              {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Only the business owner can save a default rate.</p>
          )}
        </div>
      </div>
    </div>
  )
}
