import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { getStripe, appOrigin, notConfigured } from '@/lib/stripe'
import { syncConnectedAccount } from '@/lib/stripe-sync'

export const runtime = 'nodejs'

/**
 * Stripe Connect for a workspace: the contractor's own Stripe account, so
 * their customers can pay invoices online.
 *
 * The account is created with Stripe handling pricing and losses: the
 * contractor pays Stripe's fees directly, Stripe deals with disputes and
 * negative balances, and the contractor gets the full Stripe dashboard.
 * FieldMS adds no fee and never holds customer money.
 *
 * POST — owner: create the account if needed and return a Stripe-hosted
 *        onboarding link (ABN, ID, bank details are collected by Stripe).
 * GET  — office: refresh and return the account's status.
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
  const { data: existing } = await admin
    .from('tenant_payment_accounts')
    .select('stripe_account_id')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  let accountId = existing?.stripe_account_id as string | undefined
  if (!accountId) {
    const [{ data: tenant }, { data: profile }] = await Promise.all([
      admin.from('tenants').select('name, website').eq('id', tenantId).single(),
      admin.from('profiles').select('email').eq('id', authz.userId).maybeSingle(),
    ])
    const account = await stripe.accounts.create({
      country: 'AU',
      email: profile?.email ?? undefined,
      business_profile: { name: tenant?.name ?? undefined },
      controller: {
        fees: { payer: 'account' },
        losses: { payments: 'stripe' },
        stripe_dashboard: { type: 'full' },
      },
      metadata: { tenant_id: tenantId },
    })
    accountId = account.id
    const { error } = await admin
      .from('tenant_payment_accounts')
      .insert({ tenant_id: tenantId, stripe_account_id: accountId })
    if (error) throw error
  }

  const origin = appOrigin(request)
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${origin}/dashboard/plan?connect=refresh`,
    return_url: `${origin}/dashboard/plan?connect=return`,
  })
  return NextResponse.json({ url: link.url })
}

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get('tenantId') ?? ''
  const authz = await requireTenantRole(tenantId, ['owner', 'manager'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()
  const { data: row } = await admin
    .from('tenant_payment_accounts')
    .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!row) return NextResponse.json({ connected: false })

  const stripe = getStripe()
  if (stripe) {
    const account = await stripe.accounts.retrieve(row.stripe_account_id)
    await syncConnectedAccount(admin, account)
    return NextResponse.json({
      connected: true,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    })
  }
  return NextResponse.json({ connected: true, ...row, stripe_account_id: undefined })
}
