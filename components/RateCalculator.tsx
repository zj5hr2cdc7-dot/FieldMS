'use client'

/**
 * The charge-out rate calculator UI, shared by two very different pages:
 *
 *   /charge-out-rate-calculator  — public, no login, a lead magnet
 *   /dashboard/rate-calculator   — signed in, can save the answer as the
 *                                  business's default labour rate
 *
 * It is one component on purpose. The public page is the first real thing a
 * stranger sees from FieldMS, so if the two ever disagreed about the maths or
 * the wording, the public one would be the version that was wrong in front of
 * the people who trust us least. The only difference between them is what sits
 * under the result, which is what `renderAction` is for.
 *
 * All arithmetic lives in lib/rate-calculator.ts — pure, no I/O, so the page
 * and any future server use cannot drift apart either.
 */

import { useMemo, useState, type ReactNode } from 'react'
import {
  calculateRate,
  DEFAULT_RATE_INPUTS,
  OVERHEAD_PROMPTS,
  type RateInputs,
  type RateResult,
} from '@/lib/rate-calculator'

export const aud = (n: number, dp = 0) =>
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

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

interface Props {
  /** Starting values. The dashboard passes the business's saved inputs. */
  initialInputs?: RateInputs
  /** Rendered under the result. The whole difference between the two pages. */
  renderAction?: (result: RateResult, inputs: RateInputs) => ReactNode
}

export default function RateCalculator({ initialInputs, renderAction }: Props) {
  const [inputs, setInputs] = useState<RateInputs>(initialInputs ?? DEFAULT_RATE_INPUTS)
  const r = useMemo(() => calculateRate(inputs), [inputs])

  const set = (k: keyof RateInputs, v: string) =>
    setInputs((p) => ({ ...p, [k]: v === '' ? 0 : Number(v) }))

  return (
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
                <input
                  type="number"
                  min={0}
                  step={f.step ?? 1}
                  value={inputs[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={inputCls}
                />
                {f.suffix && <span className="text-sm text-slate-400">{f.suffix}</span>}
              </div>
            </label>
          ))}
        </div>

        <details className="group mt-5">
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
          <p className="mt-1 text-5xl font-black">
            {aud(r.suggestedRate)}<span className="text-xl font-semibold text-white/60">/hr</span>
          </p>
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
            {([
              ['Paid hours a year', Math.round(r.paidHoursPerYear).toLocaleString('en-AU')],
              ['Billable hours a year', Math.round(r.billableHoursPerYear).toLocaleString('en-AU')],
              ['Wages + on-costs', aud(r.labourCostPerYear)],
              ['Total costs a year', aud(r.totalCostPerYear)],
              ['Labour revenue at this rate', aud(r.revenuePerYear)],
              ['Profit a year', aud(r.profitPerYear)],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-semibold text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            Materials are priced separately with their own markup, so they’re left out here.
          </p>
        </div>

        {r.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ul className="space-y-1.5 text-sm text-amber-900">
              {r.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          </div>
        )}

        {renderAction?.(r, inputs)}
      </div>
    </div>
  )
}
