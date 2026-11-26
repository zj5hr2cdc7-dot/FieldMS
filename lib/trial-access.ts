/**
 * Whether a workspace may do new work right now.
 *
 * WHY THIS IS SEPARATE FROM lib/trial.ts
 *   lib/trial.ts calls the `fieldms_access` RPC from the browser. That RPC
 *   checks `is_member(auth.uid())`, so it cannot be used from a server route
 *   holding the service-role client — there is no auth.uid() there. The
 *   decision itself is three lines of logic, so it lives here as a pure
 *   function with no imports, usable from both sides and testable on its own.
 *
 * IT MUST AGREE WITH THE SQL.
 *   migration 040's fieldms_access() is the other copy. If one changes, both
 *   change. scripts/trial-access-tests.mjs pins the shared truth table:
 *
 *     subscription active | trialing | past_due   -> subscribed
 *     no subscription, trial_ends_at NULL          -> trial  (never started)
 *     no subscription, trial_ends_at in future     -> trial
 *     no subscription, trial_ends_at in past       -> expired
 *
 *   past_due counts as subscribed on purpose: a failed card is a dunning
 *   problem, not a reason to lock someone out of their own job records
 *   mid-week. Stripe retries and the terms say we email first.
 */

export type AccessStatus = 'subscribed' | 'trial' | 'expired'

/** Subscription states that still count as paying. Mirrors the SQL list. */
export const ACTIVE_SUBSCRIPTION_STATES = ['active', 'trialing', 'past_due'] as const

export function accessStatusFrom(input: {
  subscriptionStatus: string | null | undefined
  trialEndsAt: string | null | undefined
  now?: Date
}): AccessStatus {
  const { subscriptionStatus, trialEndsAt } = input
  const now = input.now ?? new Date()

  if (subscriptionStatus && (ACTIVE_SUBSCRIPTION_STATES as readonly string[]).includes(subscriptionStatus)) {
    return 'subscribed'
  }
  if (!trialEndsAt) return 'trial'

  const ends = new Date(trialEndsAt).getTime()
  // An unparseable date must not lock anyone out. Fail open: the worst case
  // is a few days of free use, against locking a paying business out of its
  // own compliance records because of a malformed timestamp.
  if (!Number.isFinite(ends)) return 'trial'

  return ends > now.getTime() ? 'trial' : 'expired'
}

/**
 * What an expired workspace may still do.
 *
 * The terms promise two things that this has to honour, so they are encoded
 * here rather than left to whoever edits a route next:
 *
 *   "the workspace is paused, not deleted: your data is kept and everything
 *    is available again as soon as you choose a plan"
 *   "Your data stays exportable whether you are a customer or not."
 *
 * So expiry blocks NEW work and anything that costs money to run. It must
 * never block reading, exporting, paying, or closing the account — and it
 * must never block a CUSTOMER of theirs who is approving a quote or paying
 * an invoice through a public token link. That third party is not the one
 * whose trial ran out.
 */
export const EXPIRY_BLOCKS = [
  'sending email or SMS to customers',
  'the AI assistant',
  'refreshing supplier pricing',
  'inviting new team members',
] as const

export const EXPIRY_NEVER_BLOCKS = [
  'reading or exporting their own data',
  'subscribing, or opening the billing portal',
  'closing the account',
  'their customers approving quotes or paying invoices by token link',
] as const
