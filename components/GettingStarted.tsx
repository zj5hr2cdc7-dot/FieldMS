'use client'

/**
 * Getting Started card — shows onboarding progress on the dashboard until
 * the workspace earns its "FieldMS Ready" badge, then celebrates and can be
 * dismissed. New workspaces that haven't started the wizard are nudged in.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { getOnboarding, STEP_LABELS, STEP_ORDER, type OnboardingState } from '@/lib/onboarding'

export default function GettingStarted() {
  const { currentTenant } = useAuthContext()
  const [state, setState] = useState<OnboardingState | null | 'loading'>('loading')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!currentTenant) return
    let active = true
    Promise.resolve().then(() => {
      if (active) setDismissed(window.localStorage.getItem(`fieldms-gs-dismissed-${currentTenant.id}`) === '1')
    })
    getOnboarding(currentTenant.id)
      .then((s) => { if (active) setState(s) })
      .catch(() => { if (active) setState(null) })
    return () => { active = false }
  }, [currentTenant])

  if (!currentTenant || state === 'loading' || dismissed) return null

  const done = state?.completed_steps ?? []
  const tourDone = state?.tour_completed ?? false
  const allDone = state?.status === 'completed' && tourDone
  const started = state !== null && state.status !== 'pending'

  const dismiss = () => {
    window.localStorage.setItem(`fieldms-gs-dismissed-${currentTenant.id}`, '1')
    setDismissed(true)
  }

  // Fully complete → badge, dismissible
  if (allDone) {
    return (
      <div className="card mb-6 flex flex-col items-start justify-between gap-3 border-green-200 bg-green-50/60 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-lg text-white">🏅</span>
          <div>
            <p className="text-sm font-bold text-slate-900">FieldMS Ready</p>
            <p className="text-sm text-slate-500">Setup complete — your workspace is fully tuned to your trade.</p>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm">
          Dismiss
        </button>
      </div>
    )
  }

  const items: { label: string; done: boolean }[] = [
    ...STEP_ORDER.filter((s) => s !== 'tour').map((s) => ({ label: STEP_LABELS[s], done: done.includes(s) })),
    { label: 'Tutorial complete', done: tourDone },
  ]
  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="card mb-6 p-5" data-tour="getting-started">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-900">
            {started ? 'Finish setting up FieldMS' : 'Welcome! Let’s set up FieldMS for your trade'}
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            {doneCount} of {items.length} steps done — takes just a few minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('fieldms-start-tour'))}
            className="btn btn-secondary btn-sm"
          >
            Take the tour
          </button>
          <Link href="/dashboard/onboarding" className="btn btn-primary btn-sm">
            {started ? 'Resume setup' : 'Start setup'}
          </Link>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((i) => (
          <span
            key={i.label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
              i.done ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
            }`}
          >
            {i.done ? '✓' : '○'} {i.label}
          </span>
        ))}
      </div>
    </div>
  )
}
