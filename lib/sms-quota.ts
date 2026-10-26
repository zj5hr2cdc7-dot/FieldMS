/**
 * Monthly SMS allowance per plan.
 *
 * WHY SMS IS METERED AND EMAIL IS NOT
 *   Email through Resend is effectively free per message. SMS through Twilio
 *   is not, and the bill lands on FieldMS rather than on the business sending
 *   the texts. Left unmetered, a few busy workspaces can cost more than the
 *   subscriptions of everyone on the platform — the kind of thing that only
 *   becomes visible on an invoice a month later.
 *
 *   So SMS stays on. It is genuinely useful and customers like being told the
 *   sparky is on the way. It is simply bounded, and when the allowance runs
 *   out EMAIL STILL SENDS. Running out of texts must never mean the customer
 *   hears nothing.
 *
 * SETTING THE NUMBERS
 *   The allowances below are a starting point, not a result. The honest way
 *   to tune them is to watch tenant_sms_usage.blocked for a month: nobody
 *   blocked means they are too generous to be doing any work; everybody
 *   blocked means they are too mean and people are getting a worse product
 *   than they paid for.
 *
 *   Rough sanity check used to pick them: a five-electrician shop doing about
 *   twenty jobs a week is ~87 jobs a month. Not every job fires every
 *   notification, so call it 1.5 texts per job — around 130 a month. Founding
 *   covers that with room; Standard covers a considerably busier shop.
 *
 *   Keep an eye on the ratio to the plan price. At roughly six cents a text,
 *   a 250-text allowance is about $15 against a $69 plan. That is tolerable.
 *   Tripling it would not be.
 */

import { createAdminClient } from '@/utils/supabase/admin'

/** Monthly SMS allowance by plan. The only numbers to change. */
export const SMS_ALLOWANCE = {
  /** No subscription: early access, or a lapsed plan. */
  none: 50,
  founding: 250,
  standard: 600,
} as const

export type SmsPlan = keyof typeof SMS_ALLOWANCE

export interface SmsQuota {
  plan: SmsPlan
  allowance: number
  sent: number
  blocked: number
  remaining: number
  /** 'YYYY-MM', UTC — see the migration for why not local time. */
  period: string
  exhausted: boolean
}

/** Current UTC billing period. */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function toPlan(value: unknown): SmsPlan {
  return value === 'founding' || value === 'standard' ? value : 'none'
}

/**
 * The tenant's plan, usage and remaining allowance for this month.
 *
 * Reads with the admin client: the send path needs this before it has any
 * user context, and the figure must not depend on who is asking.
 */
export async function getSmsQuota(tenantId: string): Promise<SmsQuota> {
  const admin = createAdminClient()
  const period = currentPeriod()

  const [{ data: subscription }, { data: usage }] = await Promise.all([
    admin
      .from('tenant_subscriptions')
      .select('plan, status')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    admin
      .from('tenant_sms_usage')
      .select('sent, blocked')
      .eq('tenant_id', tenantId)
      .eq('period', period)
      .maybeSingle(),
  ])

  // A cancelled or past-due subscription drops to the free allowance rather
  // than to zero. Cutting someone's customer notifications dead the moment a
  // card expires punishes their customers for their billing problem.
  const active = subscription?.status === 'active' || subscription?.status === 'trialing'
  const plan = active ? toPlan(subscription?.plan) : 'none'

  const allowance = SMS_ALLOWANCE[plan]
  const sent = usage?.sent ?? 0
  const blocked = usage?.blocked ?? 0

  return {
    plan,
    allowance,
    sent,
    blocked,
    remaining: Math.max(0, allowance - sent),
    period,
    exhausted: sent >= allowance,
  }
}

/**
 * Record the outcome of one SMS attempt.
 *
 * Counts only what actually went: a message Twilio rejected is not charged
 * for and must not eat someone's allowance. A blocked attempt is recorded
 * separately so the allowance can be tuned against real demand.
 */
export async function recordSmsAttempt(
  tenantId: string,
  outcome: 'sent' | 'blocked'
): Promise<void> {
  const admin = createAdminClient()
  try {
    await admin.rpc('record_sms_usage', {
      p_tenant: tenantId,
      p_period: currentPeriod(),
      p_sent: outcome === 'sent' ? 1 : 0,
      p_blocked: outcome === 'blocked' ? 1 : 0,
    })
  } catch (err) {
    // Never let accounting break delivery. An uncounted text is a rounding
    // error; a customer who never heard from their electrician because our
    // counter had a bad day is a real problem.
    console.error('Failed to record SMS usage:', err)
  }
}

/** The sentence shown to a business that has run out for the month. */
export function exhaustedMessage(quota: SmsQuota): string {
  return (
    `Text message allowance used for ${quota.period} ` +
    `(${quota.sent} of ${quota.allowance} on the ${quota.plan === 'none' ? 'early access' : quota.plan} plan). ` +
    `Customers are still being emailed. The allowance resets at the start of next month.`
  )
}
