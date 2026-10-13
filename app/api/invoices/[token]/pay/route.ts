import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getStripe, appOrigin, notConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/invoices/<token>/pay — the customer's "Pay now" button.
 *
 * Public by design (the customer has no login); the long random token is
 * the credential, as for viewing the invoice. The amount is always the
 * balance read from the database, never anything the browser sends.
 *
 * The Checkout session is created ON the contractor's connected account, so
 * the money lands in their Stripe balance and their name is on the
 * customer's statement. Card or bank (BECS / PayTo) are offered according
 * to what the contractor has switched on in their Stripe dashboard.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const stripe = getStripe()
  if (!stripe) return notConfigured()

  const { token } = await params
  const admin = createAdminClient()

  const { data: invoice } = await admin
    .from('job_invoices')
    .select('id, tenant_id, job_id, invoice_number, status, total_inc_gst, amount_paid')
    .eq('public_token', token)
    .maybeSingle()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  if (['paid', 'void', 'draft'].includes(invoice.status)) {
    return NextResponse.json({ error: 'This invoice cannot be paid online' }, { status: 409 })
  }

  const balance = Math.max(0, Number(invoice.total_inc_gst) - Number(invoice.amount_paid))
  const cents = Math.round(balance * 100)
  if (cents < 50) {
    return NextResponse.json({ error: 'Nothing left to pay on this invoice' }, { status: 409 })
  }

  const [{ data: account }, { data: tenant }] = await Promise.all([
    admin
      .from('tenant_payment_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('tenant_id', invoice.tenant_id)
      .maybeSingle(),
    admin.from('tenants').select('name').eq('id', invoice.tenant_id).single(),
  ])
  if (!account?.charges_enabled) {
    return NextResponse.json({ error: 'Online payment is not available for this invoice' }, { status: 409 })
  }

  const label = `Invoice ${invoice.invoice_number ?? ''}`.trim()
  const metadata = {
    kind: 'invoice_payment',
    fieldms_invoice_id: invoice.id,
    tenant_id: invoice.tenant_id,
    job_id: invoice.job_id,
  }
  const origin = appOrigin(request)

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aud',
            unit_amount: cents,
            product_data: { name: tenant?.name ? `${label} · ${tenant.name}` : label },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata, description: label },
      success_url: `${origin}/invoice/${token}?paid=1`,
      cancel_url: `${origin}/invoice/${token}`,
    },
    { stripeAccount: account.stripe_account_id }
  )

  return NextResponse.json({ url: session.url })
}
