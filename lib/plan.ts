/**
 * Client helpers for the Plan & payments page. Reads go through RLS (office
 * staff can see their own workspace's rows); anything that talks to Stripe
 * goes through the server routes.
 */
import { createClient } from '@/utils/supabase/client'

export interface TenantSubscription {
  plan: string | null
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export interface PaymentAccountStatus {
  connected: boolean
  charges_enabled?: boolean
  payouts_enabled?: boolean
  details_submitted?: boolean
}

export async function getSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  return (data as TenantSubscription | null) ?? null
}

async function post(path: string, body: unknown): Promise<string> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || 'Something went wrong. Try again.')
  return data.url as string
}

export const startCheckout = (tenantId: string, plan: 'founding' | 'standard') =>
  post('/api/billing/checkout', { tenantId, plan })

export const openBillingPortal = (tenantId: string) => post('/api/billing/portal', { tenantId })

export const startPaymentsOnboarding = (tenantId: string) => post('/api/payments/connect', { tenantId })

export async function getPaymentAccountStatus(tenantId: string): Promise<PaymentAccountStatus> {
  const res = await fetch(`/api/payments/connect?tenantId=${encodeURIComponent(tenantId)}`)
  if (!res.ok) return { connected: false }
  return res.json()
}
