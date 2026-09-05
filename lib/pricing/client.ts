/** Client-side queries and settings for the pricing engine. */

import { createClient } from '@/utils/supabase/client'
import type {
  MasterProduct,
  PriceAlert,
  PriceChange,
  ResolvedPrice,
  SupplierProduct,
  TenantPricingSettings,
  TenantSupplierAccount,
  TrendWindows,
} from '@/types/pricing'

export async function searchProducts(query: string, limit = 50): Promise<MasterProduct[]> {
  const supabase = createClient()
  let builder = supabase.from('master_products').select('*').order('name').limit(limit)
  if (query.trim()) builder = builder.ilike('name', `%${query.trim()}%`)
  const { data, error } = await builder
  if (error) throw error
  return (data || []) as MasterProduct[]
}

export async function getSupplierOffers(masterProductId: string): Promise<SupplierProduct[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('supplier_products')
    .select('*')
    .eq('master_product_id', masterProductId)
    .order('price')
  if (error) throw error
  return (data || []).map((o) => ({ ...o, price: Number(o.price) })) as SupplierProduct[]
}

export async function getRecentChanges(masterProductId: string, limit = 20): Promise<PriceChange[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('price_changes')
    .select('*')
    .eq('master_product_id', masterProductId)
    .order('recorded_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).map((c) => ({
    ...c,
    old_price: Number(c.old_price),
    new_price: Number(c.new_price),
    pct_change: Number(c.pct_change),
  })) as PriceChange[]
}

// ── Settings ────────────────────────────────────────────────────────────────

export async function getPricingSettings(tenantId: string): Promise<TenantPricingSettings | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenant_pricing_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw error
  return data as TenantPricingSettings | null
}

export async function savePricingSettings(
  tenantId: string,
  updates: Partial<Omit<TenantPricingSettings, 'tenant_id' | 'updated_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_pricing_settings')
    .upsert({ tenant_id: tenantId, ...updates }, { onConflict: 'tenant_id' })
  if (error) throw error
}

// ── Overrides ───────────────────────────────────────────────────────────────

export async function setPriceOverride(
  tenantId: string,
  masterProductId: string,
  userId: string,
  price: number,
  note?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tenant_price_overrides').upsert(
    { tenant_id: tenantId, master_product_id: masterProductId, price, note: note ?? null, created_by: userId },
    { onConflict: 'tenant_id,master_product_id' }
  )
  if (error) throw error
}

export async function clearPriceOverride(tenantId: string, masterProductId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_price_overrides')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('master_product_id', masterProductId)
  if (error) throw error
}

// ── Linked supplier accounts ────────────────────────────────────────────────

export async function getSupplierAccounts(tenantId: string): Promise<TenantSupplierAccount[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenant_supplier_accounts')
    .select('id, tenant_id, supplier_key, account_reference, status, last_synced_at, created_at')
    .eq('tenant_id', tenantId)
  if (error) throw error
  return (data || []) as TenantSupplierAccount[]
}

export async function linkSupplierAccount(
  tenantId: string,
  userId: string,
  supplierKey: string,
  accountReference: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tenant_supplier_accounts').upsert(
    {
      tenant_id: tenantId,
      supplier_key: supplierKey,
      account_reference: accountReference,
      status: 'pending', // becomes 'connected' once the supplier feed is activated
      created_by: userId,
    },
    { onConflict: 'tenant_id,supplier_key' }
  )
  if (error) throw error
}

export async function unlinkSupplierAccount(accountId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_supplier_accounts')
    .update({ status: 'disconnected' })
    .eq('id', accountId)
  if (error) throw error
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export async function getAlerts(tenantId: string, unreadOnly = false): Promise<PriceAlert[]> {
  const supabase = createClient()
  let builder = supabase
    .from('price_alerts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (unreadOnly) builder = builder.eq('read', false)
  const { data, error } = await builder
  if (error) throw error
  return (data || []) as PriceAlert[]
}

export async function markAlertsRead(tenantId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('price_alerts').update({ read: true }).eq('tenant_id', tenantId).eq('read', false)
  if (error) throw error
}

// ── Server-backed helpers ───────────────────────────────────────────────────

export async function resolvePrices(
  tenantId: string,
  masterProductIds: string[],
  includeTrends = false
): Promise<{ prices: ResolvedPrice[]; trends: TrendWindows | null }> {
  const res = await fetch('/api/pricing/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, masterProductIds, includeTrends }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Failed to resolve prices')
  return { prices: body.prices, trends: body.trends }
}

export async function triggerRefresh(): Promise<{ ok: boolean; results: unknown[]; failures: { supplier: string; error: string }[] }> {
  const res = await fetch('/api/pricing/refresh', { method: 'POST' })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Refresh failed')
  return body
}
