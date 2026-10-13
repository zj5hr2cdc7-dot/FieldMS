import type Stripe from 'stripe'
import { createAdminClient } from '@/utils/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { syncSubscription, syncConnectedAccount, recordInvoicePayment } from '@/lib/stripe-sync'

export const runtime = 'nodejs'

/**
 * POST /api/stripe/webhook — Stripe tells us what happened.
 *
 * Two endpoints in the Stripe dashboard can point here:
 *   - "Your account" events  → signed with STRIPE_WEBHOOK_SECRET
 *       FieldMS subscriptions (checkout completed, subscription changes)
 *   - "Connected accounts"   → signed with STRIPE_CONNECT_WEBHOOK_SECRET
 *       contractor onboarding (account.updated) and invoices paid online
 *
 * Every event is signature-checked against the raw body before anything is
 * trusted. Already-processed event ids are skipped, and the database has a
 * unique key on the payment intent, so Stripe's retries are harmless.
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return new Response('Stripe not configured', { status: 503 })

  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })
  const payload = await request.text()

  const secrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s)
  )
  let event: Stripe.Event | null = null
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret)
      break
    } catch {
      // try the next secret
    }
  }
  if (!event) return new Response('Invalid signature', { status: 400 })

  const admin = createAdminClient()
  const { data: seen } = await admin.from('stripe_events').select('id').eq('id', event.id).maybeSingle()
  if (seen) return Response.json({ received: true, duplicate: true })

  try {
    await handle(stripe, admin, event)
  } catch (err) {
    // Non-2xx makes Stripe retry later, which is what we want.
    console.error('Stripe webhook failed:', event.type, event.id, err)
    return new Response('Webhook handler failed', { status: 500 })
  }

  await admin.from('stripe_events').insert({ id: event.id, type: event.type, account: event.account ?? null })
  return Response.json({ received: true })
}

async function handle(stripe: Stripe, admin: ReturnType<typeof createAdminClient>, event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      if (event.account) {
        // A customer paid a contractor's invoice (bank payments complete
        // later, on async_payment_succeeded).
        if (session.metadata?.kind === 'invoice_payment') {
          await recordInvoicePayment(admin, session, event.account)
        }
        return
      }
      if (session.mode === 'subscription' && session.subscription) {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
        const sub = await stripe.subscriptions.retrieve(subId)
        await syncSubscription(admin, sub)
      }
      return
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      if (event.account) return
      await syncSubscription(admin, event.data.object as Stripe.Subscription)
      return
    }

    case 'account.updated': {
      await syncConnectedAccount(admin, event.data.object as Stripe.Account)
      return
    }

    default:
      return
  }
}
