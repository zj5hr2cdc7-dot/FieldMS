'use client'

/**
 * Charge-out rate calculator, signed-in version. Works out the hourly rate
 * that covers wages, on-costs, overheads and a profit margin, given how many
 * paid hours actually get billed. The owner can save the answer as the
 * business's default labour rate, which then prefills labour lines (packages,
 * billing).
 *
 * The inputs, the result panel and the warnings all live in
 * components/RateCalculator.tsx, shared with the public page at
 * /charge-out-rate-calculator. Only the save control below is different.
 */

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getTenant, updateTenant } from '@/lib/auth'
import { can } from '@/lib/roles'
import RateCalculator, { aud } from '@/components/RateCalculator'
import { parseRateInputs, type RateInputs } from '@/lib/rate-calculator'

export default function RateCalculatorPage() {
  const { currentTenant, userRole } = useAuthContext()
  const owner = can(userRole, 'manageSettings')
  const [loaded, setLoaded] = useState<RateInputs | null>(null)
  const [ready, setReady] = useState(false)
  const [savedRate, setSavedRate] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    getTenant(currentTenant.id)
      .then((t) => {
        if (t?.rate_calculator) setLoaded(parseRateInputs(t.rate_calculator))
        if (t?.default_labour_rate != null) setSavedRate(Number(t.default_labour_rate))
      })
      .catch(() => {})
      // Mount the calculator only once the saved inputs are known, so it is
      // not seeded with defaults and then re-seeded a moment later — which
      // would throw away anything typed in between.
      .finally(() => setReady(true))
  }, [currentTenant])

  const save = async (rate: number, inputs: RateInputs) => {
    if (!currentTenant) return
    setSaving(true)
    try {
      const t = await updateTenant(currentTenant.id, {
        default_labour_rate: rate,
        rate_calculator: { ...inputs },
      })
      setSavedRate(t.default_labour_rate != null ? Number(t.default_labour_rate) : rate)
      setMsg({ ok: true, text: `Saved. New labour lines will start at ${aud(rate)}/hr.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
      window.setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Charge-out rate calculator</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          What you need to charge per hour to cover wages, on-costs and overheads, and still make a profit. All figures
          ex GST.
        </p>
      </div>

      {!ready ? (
        <p className="py-16 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <RateCalculator
          initialInputs={loaded ?? undefined}
          renderAction={(r, inputs) =>
            owner ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-600">
                  Current default labour rate:{' '}
                  <strong className="text-slate-900">{savedRate != null ? `${aud(savedRate)}/hr` : 'not set'}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => save(r.suggestedRate, inputs)}
                  disabled={saving || r.suggestedRate <= 0}
                  className="mt-3 w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {saving ? 'Saving…' : `Use ${aud(r.suggestedRate)}/hr as my default rate`}
                </button>
                {msg && <p className={`mt-2 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Only the business owner can save a default rate.</p>
            )
          }
        />
      )}
    </div>
  )
}
