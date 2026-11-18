'use client'

import Link from 'next/link'
import type { Access } from '@/lib/trial'

/**
 * Thin strip under the nav while a workspace is on its free trial. Quiet for
 * most of the month, amber in the last week so the end never comes as a
 * surprise.
 */
export default function TrialBanner({ access, isOwner }: { access: Access | null; isOwner: boolean }) {
  if (!access || access.status !== 'trial' || access.daysLeft === null) return null
  const d = access.daysLeft
  const urgent = d <= 7
  const when = d === 0 ? 'ends today' : d === 1 ? 'ends tomorrow' : `has ${d} days left`
  return (
    <div
      className={`px-4 py-2 text-center text-xs font-semibold sm:text-sm ${
        urgent ? 'bg-amber-50 text-amber-900' : 'bg-brand/5 text-slate-700'
      }`}
    >
      Your free trial {when}.
      {isOwner ? (
        <Link href="/dashboard/plan" className="ml-2 underline">
          Choose a plan
        </Link>
      ) : (
        <span className="ml-1 font-normal">Your workspace owner can choose a plan.</span>
      )}
    </div>
  )
}
