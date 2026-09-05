'use client'

/**
 * Interactive product tour — spotlight walkthrough of the main navigation.
 *
 * Starts when localStorage `fieldms-tour` is set (the Quick Start wizard sets
 * it) or when a `fieldms-start-tour` event is dispatched (Getting Started
 * card). Steps target elements marked with `data-tour="…"`; steps without a
 * visible target render as centred cards.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { canUseFaultFinder, getTradesCached, saveOnboarding } from '@/lib/onboarding'

interface TourStep {
  target?: string
  title: string
  body: string
}

function buildSteps(faultFinder: boolean): TourStep[] {
  // Fault Finder is an electrical product, so HVAC and air conditioning
  // workspaces get a pricing step in its place rather than a tour of
  // something they cannot open.
  const assistantStep: TourStep = faultFinder
    ? {
        title: '⚡ FieldMS Fault Finder',
        body: 'Describe the fault, RCD tripping, dead GPOs, breaker going on load, and get structured AS/NZS 3000 aware diagnostics in seconds: likely causes ranked, the next test to run, and what the result means.',
      }
    : {
        title: '📸 Site photos and notes',
        body: 'Capture photos, notes and signatures against the job from your phone, so the office has the full picture before you have left the driveway.',
      }

  return [
    {
      target: 'nav-dashboard',
      title: '👋 This is your Dashboard',
      body: "Today's jobs, revenue, outstanding quotes and reminders — your whole day at a glance.",
    },
    {
      target: 'nav-jobs',
      title: '🗂 Jobs',
      body: 'Everything about a customer lives here: photos, notes, invoices, certificates, forms, purchase orders and time tracking.',
    },
    {
      target: 'nav-billing',
      title: '💰 Quotes & Invoices',
      body: 'Create professional quotes in minutes — live material pricing fills in costs, and one tap turns an approved quote into an invoice.',
    },
    {
      target: 'nav-forms',
      title: '📋 Forms & Compliance',
      body: 'Fill test sheets and certificates on site, capture signatures on the spot, and send professional reports before you leave the driveway.',
    },
    assistantStep,
    {
      title: '🏷 Live Material Pricing',
      body: 'Connect your wholesalers and FieldMS keeps your negotiated pricing up to date — with full price history, so you can see exactly what went up and when.',
    },
    {
      target: 'nav-user',
      title: '⚙️ Your account',
      body: 'Profile, workspace settings, team and sign-out live up here. That’s the lot — you’re ready to go!',
    },
  ]
}

export default function ProductTour() {
  const { currentTenant } = useAuthContext()
  const [steps, setSteps] = useState<TourStep[] | null>(null)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const start = useCallback(async () => {
    const trades = currentTenant ? await getTradesCached(currentTenant.id) : []
    setSteps(buildSteps(canUseFaultFinder(trades)))
    setIndex(0)
  }, [currentTenant])

  // Launch triggers
  useEffect(() => {
    let timer: number | undefined
    if (window.localStorage.getItem('fieldms-tour') === '1') {
      window.localStorage.removeItem('fieldms-tour')
      // Defer so the nav has painted before we measure spotlight targets
      timer = window.setTimeout(() => void start(), 400)
    }
    const onStart = () => void start()
    window.addEventListener('fieldms-start-tour', onStart)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('fieldms-start-tour', onStart)
    }
  }, [start])

  // Track the highlighted element
  useEffect(() => {
    if (!steps) return
    const step = steps[index]
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
    const measure = () => setRect(el && el.offsetParent !== null ? el.getBoundingClientRect() : null)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [steps, index])

  const close = useCallback(
    async (completed: boolean) => {
      setSteps(null)
      if (completed && currentTenant) {
        await saveOnboarding(currentTenant.id, { tour_completed: true }).catch(() => {})
      }
    },
    [currentTenant]
  )

  if (!steps) return null
  const step = steps[index]
  const last = index === steps.length - 1

  // Tooltip position: under the highlight, or centred when no target
  const tooltipStyle: React.CSSProperties = rect
    ? {
        top: Math.min(rect.bottom + 14, window.innerHeight - 220),
        left: Math.min(Math.max(rect.left - 8, 12), Math.max(window.innerWidth - 372, 12)),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Backdrop / spotlight */}
      {rect ? (
        <div
          className="absolute rounded-xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
            border: '2px solid var(--color-brand)',
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/65" />
      )}

      {/* Tooltip card */}
      <div className="absolute w-[348px] max-w-[calc(100vw-24px)] rounded-xl bg-white p-5 shadow-lg" style={tooltipStyle}>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Step {index + 1} of {steps.length}
        </p>
        <h3 className="mt-1.5 text-base font-bold text-slate-900">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={() => close(false)} className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => setIndex((i) => i - 1)} className="btn btn-secondary btn-sm">
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? close(true) : setIndex((i) => i + 1))}
              className="btn btn-primary btn-sm"
            >
              {last ? 'Finish ✓' : 'Next'}
            </button>
          </div>
        </div>
        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-brand' : 'w-1.5 bg-slate-200'}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
