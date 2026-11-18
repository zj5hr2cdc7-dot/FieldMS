import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { getStripe, isPlanKey, priceIdFor, appOrigin, notConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

const ACTIVE = ['active', 'trialing', 'past_due', 'incomplete']

/** POST /api/billing/checkout — owner starts a FieldMS subscription. */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return notConfigured()

  const body = await request.json().catch(() => null)
  const tenantId = body?.tenantId
  const plan = body?.plan
  if (typeof tenantId !== 'string' || !isPlanKey(plan)) {
    return NextResponse.json({ error: 'tenantId and a valid plan are required' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const price = priceIdFor(plan)
  if (!price) return notConfigured()

  const admin = createAdminClient()
  const [{ data: existing }, { data: tenant }, { data: profile }] = await Promise.all([
    admin.from('tenant_subscriptions').select('*').eq('tenant_id', tenantId).maybeSingle(),
    admin.from('tenants').select('name, trial_ends_at').eq('id', tenantId).single(),
    admin.from('profiles').select('email').eq('id', authz.userId).maybeSingle(),
  ])

  if (existing?.stripe_subscription_id && ACTIVE.includes(existing.status)) {
    return NextResponse.json(
      { error: 'This workspace already has a plan. Use Manage billing to change it.' },
      { status: 409 }
    )
  }

  let customerId = existing?.stripe_customer_id as string | undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant?.name ?? undefined,
      email: profile?.email ?? undefined,
      metadata: { tenant_id: tenantId },
    })
    customerId = customer.id
    await admin
      .from('tenant_subscriptions')
      .upsert({ tenant_id: tenantId, stripe_customer_id: customerId }, { onConflict: 'tenant_id' })
  }

  // Choosing a plan mid-trial must not cut the trial short: the first charge
  // lands when the free 30 days end. Stripe needs a trial end at least 48
  // hours out, so in the final two days billing simply starts now.
  const trialEnd = tenant?.trial_ends_at ? Math.floor(new Date(tenant.trial_ends_at).getTime() / 1000) : 0
  const keepTrial = trialEnd > Math.floor(Date.now() / 1000) + 48 * 3600

  const origin = appOrigin(request)
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    client_reference_id: tenantId,
    metadata: { tenant_id: tenantId, plan },
    subscription_data: {
      metadata: { tenant_id: tenantId, plan },
      ...(keepTrial ? { trial_end: trialEnd } : {}),
    },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard/plan?checkout=success`,
    cancel_url: `${origin}/dashboard/plan?checkout=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
