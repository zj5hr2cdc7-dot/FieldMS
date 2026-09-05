/**
 * Supplier connector framework.
 *
 * Each Australian wholesaler is a connector implementing `SupplierConnector`.
 * The engine doesn't care where offers come from — an official API, an
 * EDI/CSV price file, or a catalog feed all produce `ConnectorOffer[]`.
 *
 * Reality note: AU wholesalers (Rexel Group, Middy's, CNW, …) do not expose
 * public pricing APIs. Trade pricing requires per-supplier credentials or a
 * data-feed agreement. Those connectors are registered here as typed slots
 * with `ready: false`; activating one means implementing `fetchOffers()`
 * against the feed you've been granted — nothing else in the engine changes.
 */

import type { ConnectorOffer, SupplierKey } from '@/types/pricing'
import { SPARKY_DIRECT_EQUIPMENT } from '@/lib/equipment'

export interface SupplierConnector {
  key: SupplierKey
  name: string
  /** True when fetchOffers is implemented against a real feed. */
  ready: boolean
  /** Whether this supplier supports per-tenant trade pricing when linked. */
  supportsTradeAccounts: boolean
  /**
   * Fetch current offers. `credential` is the tenant's feed credential when
   * syncing a linked trade account; undefined for public/market pricing.
   */
  fetchOffers(credential?: string): Promise<ConnectorOffer[]>
}

// ── Product matching ────────────────────────────────────────────────────────

/**
 * Normalises a product name for alias matching: lowercase, strip punctuation,
 * collapse whitespace, drop marketing filler words.
 */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(the|and|with|for|new|genuine|premium)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Match priority: MPN (exact, case-insensitive) → normalised name/alias.
 * "Clipsal 3025VW", "Iconic Double GPO 3025" and "Twin Power Outlet 3025"
 * converge on the same master product via MPN "3025" + alias entries.
 */
export function buildMatchKeys(offer: ConnectorOffer): { mpn: string | null; nameKey: string } {
  return {
    mpn: offer.mpn ? offer.mpn.trim().toUpperCase() : null,
    nameKey: normaliseName(offer.name),
  }
}

// ── Sparky Direct: catalog-backed connector (active today) ─────────────────

const sparkyDirect: SupplierConnector = {
  key: 'sparky_direct',
  name: 'Sparky Direct',
  ready: true,
  supportsTradeAccounts: false,
  async fetchOffers(): Promise<ConnectorOffer[]> {
    // Backed by the imported catalog; swap fetch logic for their live feed
    // without touching the engine.
    return SPARKY_DIRECT_EQUIPMENT.map((item) => ({
      sku: item.sku,
      name: item.name,
      category: item.category,
      priceExGst: item.basePrice,
      availability: 'unknown' as const,
    }))
  },
}

// ── Wholesaler slots (activate when feed access is granted) ────────────────

function pendingConnector(key: SupplierKey, name: string): SupplierConnector {
  return {
    key,
    name,
    ready: false,
    supportsTradeAccounts: true,
    async fetchOffers(): Promise<ConnectorOffer[]> {
      throw new Error(
        `${name} connector is not activated. Live pricing for ${name} requires a ` +
        `data-feed or API agreement with the supplier — implement fetchOffers() ` +
        `against the feed once access is granted.`
      )
    },
  }
}

export const CONNECTORS: SupplierConnector[] = [
  sparkyDirect,
  pendingConnector('rexel', 'Rexel'),
  pendingConnector('haymans', 'Haymans'),
  pendingConnector('lawrence_hanson', 'Lawrence & Hanson'),
  pendingConnector('middys', "Middy's"),
  pendingConnector('cnw', 'CNW'),
  pendingConnector('ideal', 'Ideal Electrical'),
  pendingConnector('cw_electrical', 'C&W Electrical'),
]

export function getConnector(key: string): SupplierConnector | undefined {
  return CONNECTORS.find((c) => c.key === key)
}

export function readyConnectors(): SupplierConnector[] {
  return CONNECTORS.filter((c) => c.ready)
}
