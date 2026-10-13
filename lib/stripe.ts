/**
 * Server-only Stripe helpers. Never import this from a 'use client' file:
 * it reads STRIPE_SECRET_KEY.
 *
 * Two separate uses of Stripe live in FieldMS:
 *   1. Billing  — workspaces pay FieldMS for their plan (subscriptions).
 *   2. Connect  — a workspace connects its OWN Stripe account so its
 *                 customers can pay invoices online. That money goes to the
 *                 contractor's account, never through FieldMS.
 */
import Stripe from 'stripe'
import { SITE_URL } from '@/lib/seo'

let _stripe: Stripe | null = null

/** Null when Stripe is not configured, so routes can return a clear 503. */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}

export const PLANS = {
  founding: { label: 'Founding member', monthly: 69, env: 'STRIPE_PRICE_FOUNDING' },
  standard: { label: 'Standard', monthly: 99, env: 'STRIPE_PRICE_STANDARD' },
} as const

export type PlanKey = keyof typeof PLANS

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PLANS
}

export function priceIdFor(plan: PlanKey): string | null {
  return process.env[PLANS[plan].env] || null
}

/**
 * Where Stripe should send people back to. Pinned to the real domain in
 * production so a spoofed Host header cannot redirect a checkout elsewhere.
 */
export function appOrigin(request: Request): string {
  return process.env.NODE_ENV === 'production' ? SITE_URL : new URL(request.url).origin
}

export function notConfigured() {
  return Response.json(
    { error: 'Online payments are not set up yet. Try again later.' },
    { status: 503 }
  )
}
