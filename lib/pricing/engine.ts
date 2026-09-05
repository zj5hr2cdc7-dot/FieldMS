/**
 * Pricing engine core (server-side; admin client).
 *
 * refreshSupplier()  — pull a connector's offers, match/upsert products,
 *                      snapshot every price, log real changes, raise alerts.
 * getMarketStats()   — low/high/average/median/count + 7-day trend.
 * getTrendWindows()  — 7/30/90/365-day trends + historical high/low/avg.
 * resolvePrice()     — the price a given tenant should see, with provenance.
 */

import { createAdminClient } from '@/utils/supabase/admin'
import { buildMatchKeys, getConnector } from '@/lib/pricing/connectors'
import type {
  ConnectorOffer,
  ConfidenceRating,
  MarketStats,
  PriceSource,
  ResolvedPrice,
  SupplierProduct,
  TenantPricingSettings,
  TrendWindows,
} from '@/types/pricing'

// ── Refresh ─────────────────────────────────────────────────────────────────

export interface RefreshResult {
  supplier: string
  offers: number
  newProducts: number
  priceChanges: number
  errors: string[]
  syncRunId?: string
}

export interface ApplyOffersOptions {
  supplierKey: string
  supplierName: string
  /** Tenant whose linked account this sync belongs to (stores trade prices + health). */
  tenantId?: string
  method?: 'api' | 'catalogue' | 'browser'
  trigger?: 'manual' | 'scheduled' | 'import'
  sourceFile?: string
}

/**
 * Apply a batch of offers from ANY source (API, catalogue import, browser
 * connector) to the catalogue. Records a sync run, never overwrites history —
 * every observation becomes a snapshot, every movement a price_change row —
 * and updates the linked account's health/next-sync fields.
 */
export async function applyOffers(offers: ConnectorOffer[], opts: ApplyOffersOptions): Promise<RefreshResult> {
  const admin = createAdminClient()
  const { supplierKey, supplierName, tenantId } = opts

  const { data: run } = await admin
    .from('sync_runs')
    .insert({
      tenant_id: tenantId ?? null,
      supplier_key: supplierKey,
      method: opts.method ?? 'api',
      trigger_type: opts.trigger ?? 'manual',
      status: 'running',
      offers: offers.length,
      source_file: opts.sourceFile ?? null,
    })
    .select('id')
    .single()

  const result = await applyOfferRows(offers, supplierKey, supplierName, tenantId)
  result.syncRunId = run?.id

  await raiseAlertsForChanges(supplierKey)

  if (run?.id) {
    await admin
      .from('sync_runs')
      .update({
        status: result.errors.length && result.errors.length >= offers.length ? 'failed' : 'success',
        new_products: result.newProducts,
        price_changes: result.priceChanges,
        errors: result.errors.slice(0, 50),
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)
  }

  // Connection health on the linked account
  if (tenantId) {
    const { data: account } = await admin
      .from('tenant_supplier_accounts')
      .select('id, sync_frequency')
      .eq('tenant_id', tenantId)
      .eq('supplier_key', supplierKey)
      .maybeSingle()
    if (account) {
      const { computeNextSync } = await import('@/lib/pricing/suppliers')
      await admin
        .from('tenant_supplier_accounts')
        .update({
          status: 'connected',
          last_error: null,
          last_synced_at: new Date().toISOString(),
          next_sync_at: computeNextSync(account.sync_frequency),
          products_synced: result.offers,
        })
        .eq('id', account.id)
    }
  }

  return result
}

export async function refreshSupplier(supplierKey: string, credential?: string, tenantId?: string): Promise<RefreshResult> {
  const connector = getConnector(supplierKey)
  if (!connector) throw new Error(`Unknown supplier: ${supplierKey}`)
  const offers = await connector.fetchOffers(credential)
  return applyOffers(offers, {
    supplierKey: connector.key,
    supplierName: connector.name,
    tenantId,
    method: 'api',
    trigger: 'manual',
  })
}

async function applyOfferRows(
  offers: ConnectorOffer[],
  supplierKey: string,
  supplierName: string,
  tenantId?: string
): Promise<RefreshResult> {
  const admin = createAdminClient()
  const result: RefreshResult = { supplier: supplierName, offers: offers.length, newProducts: 0, priceChanges: 0, errors: [] }

  for (const offer of offers) {
    try {
      const masterId = await matchOrCreateMasterProduct(offer)

      // Upsert the supplier offer
      const { data: existing } = await admin
        .from('supplier_products')
        .select('id, price')
        .eq('supplier_key', supplierKey)
        .eq('sku', offer.sku)
        .maybeSingle()

      // Rich catalogue fields shared by insert & update
      const richFields = {
        availability: offer.availability ?? 'unknown',
        stock_level: offer.stockLevel ?? null,
        product_url: offer.productUrl ?? null,
        mpn: offer.mpn ?? null,
        image_url: offer.imageUrl ?? null,
        datasheet_url: offer.datasheetUrl ?? null,
        description: offer.description ?? null,
        pack_size: offer.packSize ?? 1,
        retail_price: offer.retailPriceExGst ?? null,
        gst_rate: offer.gstRate ?? 10,
        discontinued: offer.discontinued ?? false,
        replacement_sku: offer.replacementSku ?? null,
        specs: offer.specs ?? {},
      }

      let supplierProductId: string
      if (existing) {
        supplierProductId = existing.id
        const oldPrice = Number(existing.price)
        const newPrice = offer.priceExGst

        await admin
          .from('supplier_products')
          .update({
            master_product_id: masterId,
            price: newPrice,
            ...richFields,
            last_updated: new Date().toISOString(),
          })
          .eq('id', existing.id)

        // Log genuine changes (old, new, %, supplier, timestamp). Never
        // overwrite history — this is the pricing snapshot engine.
        if (Math.abs(newPrice - oldPrice) > 0.0001) {
          const pct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0
          await admin.from('price_changes').insert({
            supplier_product_id: existing.id,
            master_product_id: masterId,
            supplier_key: supplierKey,
            old_price: oldPrice,
            new_price: newPrice,
            pct_change: Math.round(pct * 1000) / 1000,
          })
          result.priceChanges += 1
        }
      } else {
        const { data: inserted, error } = await admin
          .from('supplier_products')
          .insert({
            master_product_id: masterId,
            supplier_key: supplierKey,
            supplier_name: supplierName,
            sku: offer.sku,
            price: offer.priceExGst,
            ...richFields,
          })
          .select('id')
          .single()
        if (error) throw error
        supplierProductId = inserted.id
        result.newProducts += 1
      }

      // Snapshot every observation (powers trends)
      await admin.from('price_snapshots').insert({ supplier_product_id: supplierProductId, price: offer.priceExGst })

      // Tenant trade price, when syncing a linked account
      if (tenantId && offer.tradePriceExGst !== undefined) {
        await admin.from('tenant_trade_prices').upsert(
          {
            tenant_id: tenantId,
            supplier_product_id: supplierProductId,
            price: offer.tradePriceExGst,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,supplier_product_id' }
        )
      }
    } catch (err) {
      result.errors.push(`${offer.sku}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return result
}

/** MPN-first matching, then normalised name/alias; creates the master product if new. */
async function matchOrCreateMasterProduct(offer: ConnectorOffer): Promise<string> {
  const admin = createAdminClient()
  const { mpn, nameKey } = buildMatchKeys(offer)

  if (mpn) {
    const { data } = await admin.from('master_products').select('id').ilike('mpn', mpn).limit(1)
    if (data?.length) return data[0].id
  }

  const { data: byAlias } = await admin
    .from('master_products')
    .select('id, aliases')
    .contains('aliases', [nameKey])
    .limit(1)
  if (byAlias?.length) return byAlias[0].id

  const { data: created, error } = await admin
    .from('master_products')
    .insert({
      name: offer.name,
      category: offer.category ?? 'General',
      brand: offer.brand ?? null,
      mpn: mpn,
      unit: offer.unit ?? 'each',
      aliases: [nameKey],
    })
    .select('id')
    .single()
  if (error) throw error
  return created.id
}

/** Turns significant recent price changes into per-tenant alerts based on each tenant's threshold. */
async function raiseAlertsForChanges(supplierKey: string): Promise<void> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString() // this refresh pass

  const { data: changes } = await admin
    .from('price_changes')
    .select('master_product_id, pct_change, supplier_key, new_price, old_price')
    .eq('supplier_key', supplierKey)
    .gte('recorded_at', since)
  if (!changes?.length) return

  const { data: tenants } = await admin.from('tenant_pricing_settings').select('tenant_id, alert_threshold_pct')
  if (!tenants?.length) return

  const { data: products } = await admin
    .from('master_products')
    .select('id, name')
    .in('id', [...new Set(changes.map((c: { master_product_id: string }) => c.master_product_id))])
  const nameById = new Map((products || []).map((p: { id: string; name: string }) => [p.id, p.name]))

  const rows: Record<string, unknown>[] = []
  for (const tenant of tenants) {
    for (const change of changes) {
      if (Math.abs(Number(change.pct_change)) >= Number(tenant.alert_threshold_pct)) {
        const direction = Number(change.pct_change) > 0 ? 'increased' : 'decreased'
        rows.push({
          tenant_id: tenant.tenant_id,
          master_product_id: change.master_product_id,
          message: `${nameById.get(change.master_product_id) ?? 'A product'} ${direction} by ${Math.abs(Number(change.pct_change)).toFixed(1)}% at ${supplierKey.replace('_', ' ')} ($${Number(change.old_price).toFixed(2)} → $${Number(change.new_price).toFixed(2)})`,
          pct_change: change.pct_change,
          supplier_key: supplierKey,
        })
      }
    }
  }
  if (rows.length) await admin.from('price_alerts').insert(rows)
}

// ── Stats & trends ──────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function computeStats(offers: Pick<SupplierProduct, 'price'>[], trendPct7d: number | null = null): MarketStats {
  const prices = offers.map((o) => Number(o.price)).filter((p) => Number.isFinite(p) && p > 0)
  if (!prices.length) return { lowest: null, highest: null, average: null, median: null, supplierCount: 0, trendPct7d }
  return {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
    median: median(prices),
    supplierCount: prices.length,
    trendPct7d,
  }
}

export async function getTrendWindows(masterProductId: string): Promise<TrendWindows> {
  const admin = createAdminClient()
  const { data: offerRows } = await admin.from('supplier_products').select('id').eq('master_product_id', masterProductId)
  const ids = (offerRows || []).map((r: { id: string }) => r.id)
  if (!ids.length) {
    return { pct7d: null, pct30d: null, pct90d: null, pct365d: null, historicalHigh: null, historicalLow: null, historicalAverage: null }
  }

  const { data: snapshots } = await admin
    .from('price_snapshots')
    .select('price, recorded_at')
    .in('supplier_product_id', ids)
    .order('recorded_at', { ascending: true })
    .limit(5000)

  const rows = (snapshots || []).map((s: { price: unknown; recorded_at: string }) => ({
    price: Number(s.price),
    at: new Date(s.recorded_at).getTime(),
  }))
  if (!rows.length) {
    return { pct7d: null, pct30d: null, pct90d: null, pct365d: null, historicalHigh: null, historicalLow: null, historicalAverage: null }
  }

  const prices = rows.map((r) => r.price)
  const latest = prices[prices.length - 1]
  const pctSince = (days: number): number | null => {
    const cutoff = Date.now() - days * 86400_000
    const window = rows.filter((r) => r.at >= cutoff)
    if (window.length < 2) return null
    const first = window[0].price
    return first > 0 ? Math.round(((latest - first) / first) * 1000) / 10 : null
  }

  return {
    pct7d: pctSince(7),
    pct30d: pctSince(30),
    pct90d: pctSince(90),
    pct365d: pctSince(365),
    historicalHigh: Math.max(...prices),
    historicalLow: Math.min(...prices),
    historicalAverage: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
  }
}

// ── Price resolution ────────────────────────────────────────────────────────

function confidence(offers: SupplierProduct[]): ConfidenceRating {
  if (!offers.length) return 'low'
  const freshest = Math.max(...offers.map((o) => new Date(o.last_updated).getTime()))
  const daysOld = (Date.now() - freshest) / 86400_000
  if (offers.length >= 3 && daysOld <= 7) return 'high'
  if (daysOld <= 30) return 'medium'
  return 'low'
}

/**
 * Resolves the price a tenant should see for one master product, honouring:
 * manual override → linked trade pricing → configured market source.
 */
export async function resolvePrice(
  tenantId: string,
  masterProductId: string,
  settings: TenantPricingSettings
): Promise<ResolvedPrice> {
  const admin = createAdminClient()

  const [{ data: offers }, { data: override }, { data: tradeRows }, trend] = await Promise.all([
    admin.from('supplier_products').select('*').eq('master_product_id', masterProductId),
    admin.from('tenant_price_overrides').select('price, updated_at').eq('tenant_id', tenantId).eq('master_product_id', masterProductId).maybeSingle(),
    admin
      .from('tenant_trade_prices')
      .select('price, last_updated, supplier_products!inner(id, master_product_id, supplier_key, supplier_name, sku)')
      .eq('tenant_id', tenantId)
      .eq('supplier_products.master_product_id', masterProductId),
    getTrendWindows(masterProductId),
  ])

  const supplierOffers = (offers || []) as SupplierProduct[]
  const stats = computeStats(supplierOffers, trend.pct7d)
  const conf = confidence(supplierOffers)

  const base: Omit<ResolvedPrice, 'price' | 'source' | 'sourceLabel' | 'supplierKey' | 'supplierName' | 'sku' | 'lastUpdated'> = {
    masterProductId,
    confidence: conf,
    stats,
  }

  // 1. Manual override always wins (unless the user opted into auto-updates)
  if (override && !settings.auto_update_overrides) {
    return {
      ...base,
      price: Number(override.price),
      source: 'override',
      sourceLabel: 'Manual override (never auto-updated)',
      supplierKey: null,
      supplierName: null,
      sku: null,
      lastUpdated: override.updated_at,
    }
  }

  // 2. Trade pricing from linked accounts
  type TradeRow = { price: unknown; last_updated: string; supplier_products: { supplier_key: string; supplier_name: string; sku: string } }
  const trades = ((tradeRows || []) as unknown as TradeRow[])
    .map((t) => ({
      price: Number(t.price),
      lastUpdated: t.last_updated,
      supplierKey: t.supplier_products.supplier_key,
      supplierName: t.supplier_products.supplier_name,
      sku: t.supplier_products.sku,
    }))
    .sort((a, b) => a.price - b.price)

  if (trades.length && ['cheapest_trade', 'preferred_supplier'].includes(settings.price_source)) {
    const preferred = settings.price_source === 'preferred_supplier'
      ? trades.find((t) => t.supplierKey === settings.preferred_supplier_key)
      : undefined
    const chosen = preferred ?? trades[0]
    return {
      ...base,
      price: chosen.price,
      source: 'trade',
      sourceLabel: preferred
        ? `Your ${chosen.supplierName} trade price (preferred supplier)`
        : `Cheapest linked trade price — ${chosen.supplierName}${trades.length > 1 ? ` (beats ${trades.length - 1} other account${trades.length > 2 ? 's' : ''})` : ''}`,
      supplierKey: chosen.supplierKey,
      supplierName: chosen.supplierName,
      sku: chosen.sku,
      lastUpdated: chosen.lastUpdated,
    }
  }

  // 3. Market pricing modes
  const cheapestOffer = supplierOffers.length ? [...supplierOffers].sort((a, b) => Number(a.price) - Number(b.price))[0] : null
  const lastUpdated = supplierOffers.length
    ? new Date(Math.max(...supplierOffers.map((o) => new Date(o.last_updated).getTime()))).toISOString()
    : null

  const marketPick: Record<string, { price: number | null; label: string }> = {
    market_average: { price: stats.average, label: `Average market price (${stats.supplierCount} supplier${stats.supplierCount === 1 ? '' : 's'})` },
    market_lowest: { price: stats.lowest, label: `Lowest market price — ${cheapestOffer?.supplier_name ?? ''}` },
    market_median: { price: stats.median, label: `Median market price (${stats.supplierCount} supplier${stats.supplierCount === 1 ? '' : 's'})` },
  }
  const pick = marketPick[settings.price_source] ?? marketPick.market_median

  return {
    ...base,
    price: pick.price ?? (override ? Number(override.price) : null),
    source: settings.price_source,
    sourceLabel: pick.price !== null ? pick.label : 'No market data yet',
    supplierKey: settings.price_source === 'market_lowest' ? cheapestOffer?.supplier_key ?? null : null,
    supplierName: settings.price_source === 'market_lowest' ? cheapestOffer?.supplier_name ?? null : null,
    sku: settings.price_source === 'market_lowest' ? cheapestOffer?.sku ?? null : null,
    lastUpdated,
  }
}

export const DEFAULT_PRICING_SETTINGS: Omit<TenantPricingSettings, 'tenant_id' | 'updated_at'> = {
  price_source: 'market_median' as PriceSource,
  preferred_supplier_key: null,
  alert_threshold_pct: 5,
  auto_update_overrides: false,
}
