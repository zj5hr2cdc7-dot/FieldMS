/**
 * Feature switches.
 *
 * WHY THESE EXIST
 *   Not every finished feature is a feature you can afford to RUN. Each of
 *   the ones switched off below either costs money per use with no revenue
 *   behind it, or generates support you cannot automate, or both. The code is
 *   kept and tested; only the door is shut.
 *
 *   Every flag is off unless its variable is explicitly "true", so a missing
 *   variable fails safe rather than quietly turning something on.
 *
 * ── FAULT_FINDER_ENABLED ───────────────────────────────────────────────────
 * The AI fault finding assistant is OFF until its advice, wording and
 * liability position have been reviewed (lawyer + insurer + a licensed
 * electrician), and until the knowledge base question in STANDARDS_IP_REVIEW
 * is resolved. While off:
 *   - menu items, field tab, job shortcut and tour step are hidden
 *   - /dashboard/assistant and /field/assistant show a "not available" notice
 *   - /api/assistant returns 404, so nothing reaches the model
 *   - the landing page does not mention it
 *
 * ── ACCOUNTING_SYNC_ENABLED ────────────────────────────────────────────────
 * Xero and MYOB invoice/payment sync. Off because when this breaks it breaks
 * inside somebody else's books: urgent, often with their bookkeeper on the
 * call, and you are debugging a file you cannot see. MYOB has additionally
 * never been run against a real company file — see lib/myob-sync.ts.
 *
 * Turn on for ONE willing business first, not for everyone.
 *
 * ── CUSTOMER_PAYMENTS_ENABLED ──────────────────────────────────────────────
 * "Pay now" on customer invoices via Stripe Connect. Off because chargebacks,
 * stalled KYC onboarding and missing payouts are all unautomatable support,
 * and because facilitating payments between two other parties is a regulated
 * space in Australia that wants a lawyer's eye before it is live.
 *
 * NOTE: this is NOT the FieldMS subscription. Charging for FieldMS itself
 * (lib/stripe.ts PLANS, /api/billing/checkout) is a separate flow and stays
 * available — that one is how the lights stay on.
 *
 * ── SMS ────────────────────────────────────────────────────────────────────
 * Deliberately NOT behind a flag. It stays on, metered by plan instead —
 * see lib/sms-quota.ts.
 */

function enabled(value: string | undefined): boolean {
  return value === 'true'
}

export const FAULT_FINDER_ENABLED = enabled(process.env.NEXT_PUBLIC_FAULT_FINDER_ENABLED)

export const ACCOUNTING_SYNC_ENABLED = enabled(
  process.env.NEXT_PUBLIC_ACCOUNTING_SYNC_ENABLED
)

export const CUSTOMER_PAYMENTS_ENABLED = enabled(
  process.env.NEXT_PUBLIC_CUSTOMER_PAYMENTS_ENABLED
)

/**
 * One place to ask "is this switched on", for the handful of server routes
 * that need to refuse rather than render.
 */
export const FEATURES = {
  faultFinder: FAULT_FINDER_ENABLED,
  accountingSync: ACCOUNTING_SYNC_ENABLED,
  customerPayments: CUSTOMER_PAYMENTS_ENABLED,
} as const

export type FeatureKey = keyof typeof FEATURES

/** Standard refusal for a route whose feature is switched off. */
export function featureDisabled(message: string) {
  return Response.json({ error: message }, { status: 503 })
}
