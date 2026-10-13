import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { getStripe, appOrigin, notConfigured } from '@/lib/stripe'

export const runtime = 'nodejs'

/**
 * POST /api/billing/portal — opens Stripe's hosted page where the owner
 * updates their card, downloads receipts, switches plan or cancels.
 */
export async function POST(request: Request) {
  const stripe = getStripe()
  if (!stripe) return notConfigured()

  const body = await request.json().catch(() => null)
  const tenantId = body?.tenantId
  if (typeof tenantId !== 'string') {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()
  const { data: sub } = await admin
    .from('tenant_subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: 'No plan to manage yet' }, { status: 404 })
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appOrigin(request)}/dashboard/plan`,
  })
  return NextResponse.json({ url: portal.url })
}
