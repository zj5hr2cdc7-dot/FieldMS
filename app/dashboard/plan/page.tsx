'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { normaliseRole } from '@/lib/roles'
import {
  getSubscription,
  getPaymentAccountStatus,
  startCheckout,
  openBillingPortal,
  startPaymentsOnboarding,
  type TenantSubscription,
  type PaymentAccountStatus,
} from '@/lib/plan'

const PLAN_LABELS: Record<string, string> = { founding: 'Founding member', standard: 'Standard' }
const ACTIVE = ['active', 'trialing', 'past_due']

const card = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
const primaryBtn =
  'rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60'
const secondaryBtn =
  'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60'

export default function PlanPage() {
  const { currentTenant, userRole } = useAuthContext()
  const searchParams = useSearchParams()
  const isOwner = normaliseRole(userRole) === 'owner'

  const [sub, setSub] = useState<TenantSubscription | null>(null)
  const [payments, setPayments] = useState<PaymentAccountStatus>({ connected: false })
  const [sms, setSms] = useState<{
    plan: string; allowance: number; sent: number; remaining: number; period: string; exhausted: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!currentTenant) return
    let cancelled = false
    // Also runs when the owner comes back from Stripe (?connect=return), which
    // is what refreshes the payments status after onboarding.
    fetch(`/api/sms/quota?tenantId=${currentTenant.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.quota && setSms(d.quota))
      .catch(() => {})

    Promise.all([getSubscription(currentTenant.id), getPaymentAccountStatus(currentTenant.id)])
      .then(([s, p]) => {
        if (cancelled) return
        setSub(s)
        setPayments(p)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentTenant])

  const go = async (key: string, fn: () => Promise<string>) => {
    setBusy(key)
    setError('')
    try {
      window.location.href = await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setBusy(null)
    }
  }

  if (!currentTenant) return null

  const checkout = searchParams.get('checkout')
  const hasPlan = sub && ACTIVE.includes(sub.status)
  const renewal = sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('en-AU') : null

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Plan &amp; payments</h1>
        <p className="mt-1 text-slate-500">Your FieldMS plan, and taking payments on your invoices.</p>
      </div>

      {checkout === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Thanks, you&apos;re subscribed. It can take a few seconds for your plan to show here.
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* ── Customer text messages ──
          Shown here rather than buried in settings because it is the one
          allowance that runs out mid-month, and the failure mode without it
          is a business discovering the limit from a customer who says they
          never got a text. */}
      {sms && (
        <section className={card}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Customer text messages</h2>
              <p className="mt-1 text-sm text-slate-500">
                Texts to your customers this month. Emails are unlimited.
              </p>
            </div>
            <p className="shrink-0 text-right">
              <span className={`text-2xl font-black ${sms.exhausted ? 'text-amber-600' : 'text-slate-900'}`}>
                {sms.remaining}
              </span>
              <span className="block text-xs text-slate-400">of {sms.allowance} left</span>
            </p>
          </div>

          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${sms.exhausted ? 'bg-amber-500' : 'bg-brand'}`}
              style={{ width: `${Math.min(100, (sms.sent / Math.max(1, sms.allowance)) * 100)}%` }}
            />
          </div>

          {sms.exhausted && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              You have used this month&apos;s texts. Your customers are still being emailed, and the
              allowance resets at the start of next month. Upgrading your plan raises it.
            </p>
          )}
        </section>
      )}

      {/* ── FieldMS plan ── */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-slate-900">Your FieldMS plan</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-400">Loading…</p>
        ) : hasPlan ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{PLAN_LABELS[sub!.plan ?? ''] ?? 'Active plan'}</span>
              {sub!.status === 'past_due' && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Payment failed, update your card
                </span>
              )}
            </p>
            {renewal && (
              <p className="text-sm text-slate-500">
                {sub!.cancel_at_period_end ? `Ends on ${renewal}` : `Renews on ${renewal}`}
              </p>
            )}
            {isOwner && (
              <button className={secondaryBtn} disabled={busy !== null} onClick={() => go('portal', () => openBillingPortal(currentTenant.id))}>
                {busy === 'portal' ? 'Opening…' : 'Manage billing'}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600">
              One price for your whole crew. No lock-in: cancel any time from this page.
            </p>
            {isOwner ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-brand/40 bg-brand/5 p-4">
                  <p className="font-semibold text-slate-900">Founding member</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">$69<span className="text-sm font-medium text-slate-500">/month</span></p>
                  <p className="mt-1 text-xs text-slate-500">Locked in for 24 months for early customers.</p>
                  <button className={`${primaryBtn} mt-3 w-full`} disabled={busy !== null} onClick={() => go('founding', () => startCheckout(currentTenant.id, 'founding'))}>
                    {busy === 'founding' ? 'Opening…' : 'Subscribe'}
                  </button>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">Standard</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">$99<span className="text-sm font-medium text-slate-500">/month</span></p>
                  <p className="mt-1 text-xs text-slate-500">Up to 5 users.</p>
                  <button className={`${secondaryBtn} mt-3 w-full`} disabled={busy !== null} onClick={() => go('standard', () => startCheckout(currentTenant.id, 'standard'))}>
                    {busy === 'standard' ? 'Opening…' : 'Subscribe'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Only the workspace owner can choose a plan.</p>
            )}
          </div>
        )}
      </section>

      {/* ── Get paid online ── */}
      <section className={card}>
        <h2 className="text-lg font-semibold text-slate-900">Get paid online</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add a Pay now button to every invoice you send. Customers pay by card, or by bank transfer if you
          turn it on in Stripe, and the invoice marks itself paid. The money goes straight to your own Stripe
          account. FieldMS takes nothing.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Stripe charges its own fees on each payment, taken from the payment before it reaches you. Check
          Stripe&apos;s current Australian pricing for the exact rates.
        </p>

        <div className="mt-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : payments.connected && payments.charges_enabled ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-green-700">✓ Online payments are on</p>
              {!payments.payouts_enabled && (
                <p className="text-sm text-amber-700">Stripe still needs details before it can pay money out to your bank.</p>
              )}
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className={`${secondaryBtn} inline-block`}>
                Open your Stripe dashboard
              </a>
            </div>
          ) : isOwner ? (
            <div className="space-y-2">
              {payments.connected && (
                <p className="text-sm text-amber-700">Your Stripe set-up isn&apos;t finished yet.</p>
              )}
              <button className={primaryBtn} disabled={busy !== null} onClick={() => go('connect', () => startPaymentsOnboarding(currentTenant.id))}>
                {busy === 'connect' ? 'Opening Stripe…' : payments.connected ? 'Finish setting up' : 'Set up online payments'}
              </button>
              <p className="text-xs text-slate-500">
                Stripe asks for your ABN, ID and bank account. It takes about 10 minutes.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Only the workspace owner can set up online payments.</p>
          )}
        </div>
      </section>

      {/* ── Your data ── */}
      {isOwner && (
        <section className={card}>
          <h2 className="text-lg font-semibold text-slate-900">Your data</h2>
          <p className="mt-1 text-sm text-slate-600">
            Download everything in this workspace (customers, jobs, quotes, invoices, payments, test sheets and
            assets) as one file. It is yours to keep or take elsewhere.
          </p>
          <a href={`/api/export?tenantId=${encodeURIComponent(currentTenant.id)}`} className={`${secondaryBtn} mt-4 inline-block`}>
            Download my data
          </a>
        </section>
      )}
    </div>
  )
}
