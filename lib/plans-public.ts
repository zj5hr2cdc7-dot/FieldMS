/**
 * Plan presentation — safe to import anywhere.
 *
 * WHY THIS IS SEPARATE FROM lib/stripe.ts
 *   lib/stripe.ts reads STRIPE_SECRET_KEY and pulls in the Stripe SDK, so it
 *   must never reach a client bundle. But the landing page, the signup page
 *   and /dashboard/plan all need to show what a plan costs. Keeping the
 *   numbers here — with stripe.ts importing them rather than restating them —
 *   is what stops the page advertising a price the checkout does not charge.
 *
 *   If you change a price, change it HERE, and change the matching Stripe
 *   Price object. The env vars map a plan to its Stripe price id; they do not
 *   carry the amount.
 *
 * ── GST: CONFIRM THIS BEFORE CHARGING ──────────────────────────────────────
 *   Australian prices have to say whether GST is included, and saying the
 *   wrong thing is worse than saying nothing.
 *
 *   GST registration is compulsory above $75k turnover and optional below it.
 *   A pre-revenue business is usually NOT registered, which is the default
 *   here — and while you are not registered you must not charge GST or issue
 *   a tax invoice showing it.
 *
 *   The moment you register, set GST_REGISTERED to true. Then the displayed
 *   figure becomes GST-inclusive, which means either absorbing the 10% or
 *   raising the price. That is a pricing decision, not a code change, and it
 *   is much easier to make before you have customers than after.
 */

/** Set to true once FieldMS is registered for GST. See the note above. */
export const GST_REGISTERED = false

/** Suffix shown after every displayed price. */
export const GST_LABEL = GST_REGISTERED ? 'inc GST' : 'no GST'

export interface PublicPlan {
  key: 'founding' | 'standard'
  label: string
  /** AUD per month, as displayed. */
  monthly: number
  blurb: string
  features: string[]
  highlight?: boolean
}

export const PLAN_CARDS: PublicPlan[] = [
  {
    key: 'founding',
    label: 'Founding member',
    monthly: 69,
    blurb: 'For the first businesses on board. This rate stays yours for as long as you keep the plan.',
    features: [
      'Unlimited jobs, customers and quotes',
      'Your whole crew, no per-user charge',
      'Test sheets, certificates and the compliance register',
      'Field app with offline job updates',
      '250 customer text messages a month',
    ],
    highlight: true,
  },
  {
    key: 'standard',
    label: 'Standard',
    monthly: 99,
    blurb: 'The ongoing rate once early access closes.',
    features: [
      'Everything in Founding member',
      '600 customer text messages a month',
      'Priority on support',
    ],
  },
]

/** Monthly price for a plan key, for anywhere that needs just the number. */
export function monthlyFor(key: PublicPlan['key']): number {
  const plan = PLAN_CARDS.find((p) => p.key === key)
  if (!plan) throw new Error(`Unknown plan: ${key}`)
  return plan.monthly
}
