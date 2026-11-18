'use client'

import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { normaliseRole } from '@/lib/roles'

/**
 * Where crew members land once the trial is over and no plan was chosen.
 * Owners go to /dashboard/plan instead, where they can fix it.
 */
export default function TrialEndedPage() {
  const { currentTenant, userRole } = useAuthContext()
  const isOwner = normaliseRole(userRole) === 'owner'
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">The free trial has ended</h1>
        <p className="mt-3 text-slate-600">
          {currentTenant?.name ?? 'This workspace'}&apos;s 30-day trial is over. Everything you entered is
          kept safe, and it all comes back as soon as a plan is chosen.
        </p>
        {isOwner ? (
          <Link href="/dashboard/plan" className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white">
            Choose a plan
          </Link>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Ask your workspace owner to choose a plan.</p>
        )}
      </div>
    </div>
  )
}
