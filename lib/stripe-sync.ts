/**
 * Server-only: copy Stripe state into our tables. Used by the webhook and by
 * the routes that refresh status when someone returns from Stripe.
 */
import type Stripe from 'stripe'
import { createAdminClient } from '@/utils/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Subscriptions (FieldMS plan) ───────────────────────────────

export async function syncSubscription(admin: Admin, sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  let tenantId = sub.metadata?.tenant_id || null
  if (!tenantId) {
    const { data } = await admin
      .from('tenant_subscriptions')
      .select('tenant_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    tenantId = data?.tenant_id ?? null
  }
  if (!tenantId) {
    console.error('Stripe subscription with no tenant:', sub.id)
    return
  }

  // Recent API versions moved the billing period onto the subscription item.
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined
  const periodEnd = item?.current_period_end ?? null

  const { error } = await admin.from('tenant_subscriptions').upsert(
    {
      tenant_id: tenantId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      plan: sub.metadata?.plan ?? null,
      status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )
  if (error) throw error
}

// ── Connected accounts (contractor gets paid) ──────────────────

export async function syncConnectedAccount(admin: Admin, account: Stripe.Account): Promise<void> {
  const { error } = await admin
    .from('tenant_payment_accounts')
    .update({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id)
  if (error) throw error
}

// ── Invoice paid online ────────────────────────────────────────

/**
 * Record a completed Checkout payment against a FieldMS invoice.
 *
 * `connectedAccountId` is the account the event came from (event.account).
 * The invoice's workspace must own that account. Without this check, any
 * contractor with a connected account could create a Checkout session whose
 * metadata names someone else's invoice and mark it paid.
 */
export async function recordInvoicePayment(
  admin: Admin,
  session: Stripe.Checkout.Session,
  connectedAccountId: string | null
): Promise<'recorded' | 'duplicate' | 'ignored'> {
  if (session.payment_status !== 'paid') return 'ignored'
  const invoiceId = session.metadata?.fieldms_invoice_id
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  if (!invoiceId || !paymentIntentId || !connectedAccountId || session.amount_total == null) return 'ignored'

  const { data: invoice } = await admin
    .from('job_invoices')
    .select('id, tenant_id, job_id, invoice_number, total_inc_gst, amount_paid, status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) return 'ignored'

  const { data: account } = await admin
    .from('tenant_payment_accounts')
    .select('stripe_account_id')
    .eq('tenant_id', invoice.tenant_id)
    .maybeSingle()
  if (!account || account.stripe_account_id !== connectedAccountId) {
    console.error('Stripe payment from an account that does not own the invoice', { invoiceId, connectedAccountId })
    return 'ignored'
  }

  const amount = round2(session.amount_total / 100)

  // The unique stripe_payment_intent_id makes a replayed event a no-op.
  const { error: insertError } = await admin.from('job_payments').insert({
    tenant_id: invoice.tenant_id,
    job_id: invoice.job_id,
    invoice_id: invoice.id,
    kind: 'payment',
    amount,
    method: 'online (Stripe)',
    reference: paymentIntentId,
    stripe_payment_intent_id: paymentIntentId,
  })
  if (insertError) {
    if (insertError.code === '23505') return 'duplicate'
    throw insertError
  }

  const paid = round2(Number(invoice.amount_paid) + amount)
  const total = Number(invoice.total_inc_gst)
  const status = paid >= total - 0.005 ? 'paid' : 'part_paid'
  const { error: updateError } = await admin
    .from('job_invoices')
    .update({ amount_paid: paid, status, updated_at: new Date().toISOString() })
    .eq('id', invoice.id)
  if (updateError) throw updateError

  await admin.from('billing_audit_events').insert({
    tenant_id: invoice.tenant_id,
    job_id: invoice.job_id,
    event_type: 'payment_recorded',
    actor_name: 'Customer (online payment)',
    amount,
    meta: { invoice_number: invoice.invoice_number, via: 'stripe', payment_intent: paymentIntentId },
  })

  return 'recorded'
}
