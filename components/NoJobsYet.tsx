'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { isOffice } from '@/lib/roles'
import { createSampleJob } from '@/lib/sample-job'

/**
 * Empty state for pages that hang off a job.
 *
 * Test sheets, site reports and job plans all start with "pick a job". When a
 * workspace has no jobs, those pages rendered a dropdown containing only its
 * own placeholder and nothing else — which reads as broken software rather
 * than an empty account, and is exactly the sort of thing that loses a trial
 * user on day one. Say what's happening and give them the next step.
 */
export default function NoJobsYet({
  thing,
  why,
}: {
  /** What they were trying to make, e.g. "test sheet". */
  thing: string
  /** One line on why a job is needed first. */
  why: string
}) {
  const { currentTenant, session, userRole } = useAuthContext()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Office staff can drop in the sample job and come straight back here,
  // which is quicker than inventing a customer just to look around.
  const addSample = async () => {
    if (!currentTenant || !session?.user) return
    setBusy(true)
    setError('')
    try {
      await createSampleJob(currentTenant.id, session.user.id)
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the sample job')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-slate-400"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" />
        </svg>
      </div>
      <h3 className="mt-4 font-bold text-slate-900">No jobs yet</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
        {why} Create a job first, then come back and the {thing} will attach to it.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/dashboard/jobs" className="btn btn-primary inline-block">
          Create a job
        </Link>
        {isOffice(userRole) && (
          <button type="button" onClick={addSample} disabled={busy} className="btn btn-ghost">
            {busy ? 'Adding…' : 'Use a sample job'}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
