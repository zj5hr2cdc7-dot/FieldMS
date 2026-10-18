/**
 * The scheduled pricing run.
 *
 * WHAT IT DOES
 *   Two passes, in this order:
 *
 *   1. MARKET pricing, once per activated connector, with no tenant. This is
 *      the public/list price everyone sees and it populates master_products,
 *      supplier_products, price_snapshots and price_changes.
 *
 *   2. TRADE pricing, once per linked tenant_supplier_accounts row whose
 *      connector is activated, using that tenant's own credential. This is
 *      what makes a business see their rate rather than the market rate.
 *
 *   Pass 2 is the half that was never wired up. `/api/pricing/refresh` only
 *   ever did pass 1, and hardcoded trigger:'manual', so a linked trade account
 *   sat there with last_synced_at NULL forever.
 *
 * WHY IT IS SAFE TO SCHEDULE TODAY
 *   `readyConnectors()` returns only connectors whose fetchOffers() is
 *   implemented. Every other wholesaler is registered as a typed slot that
 *   throws, and is skipped here rather than counted as a failure — a feed that
 *   does not exist yet is not an error, it is a feed that does not exist yet.
 *
 *   So this runs green today against the one live connector, and the day a
 *   supplier feed agreement lands, flipping that connector's `ready` to true
 *   is the entire integration: the schedule, the credential handling, the
 *   health reporting and the price history all already run through here.
 *
 * FAILURE POLICY
 *   One supplier failing must not stop the rest. Every unit is caught
 *   individually and reported, and a tenant account that fails is marked
 *   status:'error' so the business can see it on the Materials page rather
 *   than silently receiving stale prices.
 */

import { createAdminClient } from '@/utils/supabase/admin'
import { readyConnectors, getConnector } from '@/lib/pricing/connectors'
import { applyOffers, type RefreshResult } from '@/lib/pricing/engine'

export interface ScheduledRefreshSummary {
  startedAt: string
  finishedAt: string
  durationMs: number
  market: {
    attempted: number
    results: RefreshResult[]
    failures: { supplier: string; error: string }[]
  }
  trade: {
    /** Linked accounts whose connector has a live feed. */
    attempted: number
    /** Linked accounts skipped because that supplier has no feed yet. */
    awaitingFeed: number
    results: RefreshResult[]
    failures: { tenantId: string; supplier: string; error: string }[]
  }
  ok: boolean
}

/** Market pricing: one pass per activated connector, no tenant. */
async function refreshMarket() {
  const results: RefreshResult[] = []
  const failures: { supplier: string; error: string }[] = []

  for (const connector of readyConnectors()) {
    try {
      const offers = await connector.fetchOffers()
      results.push(
        await applyOffers(offers, {
          supplierKey: connector.key,
          supplierName: connector.name,
          method: 'api',
          trigger: 'scheduled',
        })
      )
    } catch (err) {
      failures.push({
        supplier: connector.name,
        error: err instanceof Error ? err.message : 'Refresh failed',
      })
    }
  }

  return { attempted: readyConnectors().length, results, failures }
}

/** Trade pricing: one pass per linked account on an activated connector. */
async function refreshTradeAccounts() {
  const admin = createAdminClient()
  const results: RefreshResult[] = []
  const failures: { tenantId: string; supplier: string; error: string }[] = []

  const { data: accounts } = await admin
    .from('tenant_supplier_accounts')
    .select('id, tenant_id, supplier_key, credential_cipher, status')
    .neq('status', 'disconnected')

  let attempted = 0
  let awaitingFeed = 0

  for (const account of accounts ?? []) {
    const connector = getConnector(account.supplier_key)

    // No connector at all, or a slot with no feed yet. Not a failure: the
    // business linked their account number in advance, which is exactly what
    // the Materials page tells them to do.
    if (!connector || !connector.ready) {
      awaitingFeed++
      continue
    }

    attempted++
    try {
      const offers = await connector.fetchOffers(account.credential_cipher ?? undefined)
      results.push(
        await applyOffers(offers, {
          supplierKey: connector.key,
          supplierName: connector.name,
          tenantId: account.tenant_id,
          method: 'api',
          trigger: 'scheduled',
        })
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      failures.push({ tenantId: account.tenant_id, supplier: connector.name, error: message })

      // Surface it on the account rather than leaving the business on stale
      // prices with no indication anything is wrong.
      await admin
        .from('tenant_supplier_accounts')
        .update({ status: 'error' })
        .eq('id', account.id)
    }
  }

  return { attempted, awaitingFeed, results, failures }
}

/**
 * Run the whole scheduled refresh. Never throws: the caller is a cron, and a
 * thrown error there is a 500 with no detail about which half failed.
 */
export async function runScheduledPriceRefresh(): Promise<ScheduledRefreshSummary> {
  const started = Date.now()
  const startedAt = new Date(started).toISOString()

  const [market, trade] = await Promise.all([
    refreshMarket().catch((err) => ({
      attempted: 0,
      results: [] as RefreshResult[],
      failures: [{ supplier: 'all', error: err instanceof Error ? err.message : 'Market refresh failed' }],
    })),
    refreshTradeAccounts().catch((err) => ({
      attempted: 0,
      awaitingFeed: 0,
      results: [] as RefreshResult[],
      failures: [
        { tenantId: 'all', supplier: 'all', error: err instanceof Error ? err.message : 'Trade refresh failed' },
      ],
    })),
  ])

  const finished = Date.now()

  return {
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    market,
    trade,
    ok: market.failures.length === 0 && trade.failures.length === 0,
  }
}
