'use client'

/**
 * The calculator as it appears to a stranger on /charge-out-rate-calculator.
 *
 * Deliberately gives the answer before asking for anything. No email wall, no
 * "enter your details to see your result" — a tradie who hits a form where the
 * number should be closes the tab, and rightly. The call to action sits under
 * a result they already have.
 */

import Link from 'next/link'
import RateCalculator, { aud } from '@/components/RateCalculator'

export default function PublicRateCalculator() {
  return (
    <RateCalculator
      renderAction={(r) => (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm leading-6 text-slate-600">
            Knowing the number is the easy half. The hard half is {aud(r.suggestedRate)}/hr actually landing on every
            quote, every variation and every invoice, without you re-typing it.
          </p>
          <Link
            href="/signup"
            className="mt-4 block rounded-lg bg-brand px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            That’s what FieldMS does
          </Link>
          <p className="mt-2 text-center text-xs text-slate-400">
            Your whole crew, one price. Cancel any time.
          </p>
        </div>
      )}
    />
  )
}
