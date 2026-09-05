/**
 * Wholesaler registry — the single source of truth for every supplier
 * FieldMS can connect to. Adding a wholesaler is one entry here; the
 * account centre, sync engine and quote builder pick it up automatically.
 *
 * Connection tiers (preferred order):
 *   1. api       — official API / EDI feed (pricing, stock, POs)
 *   2. catalogue — scheduled or manual price-book imports (CSV/XLSX/XML/JSON)
 *   3. browser   — automation connector against the trade portal, where the
 *                  supplier's terms permit. Never brittle HTML scraping —
 *                  connectors target the portal's own data endpoints.
 */

import type { ConnectionMethod, SupplierKey } from '@/types/pricing'

export interface WholesalerInfo {
  key: SupplierKey
  name: string
  /** electrical | hvac | plumbing — used for filtering/grouping in the UI. */
  trade: 'electrical' | 'hvac' | 'data' | 'general'
  /** Methods this supplier can be connected with, best first. */
  methods: ConnectionMethod[]
  website: string
  /** Two-letter monogram + brand colour for the logo tile. */
  monogram: string
  color: string
  /** Whether trade-account (negotiated) pricing is supported when linked. */
  supportsTradeAccounts: boolean
  supportsPurchaseOrders: boolean
}

export const WHOLESALERS: WholesalerInfo[] = [
  { key: 'cnw', name: 'CNW', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.cnw.com.au', monogram: 'CN', color: '#0057a8', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'tradezone', name: 'Tradezone', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.tradezone.com.au', monogram: 'TZ', color: '#e87722', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'middys', name: "Middy's", trade: 'electrical', methods: ['api', 'catalogue', 'browser'], website: 'https://www.middys.com.au', monogram: 'MD', color: '#c8102e', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'ideal', name: 'Ideal Electrical', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.idealelectrical.com', monogram: 'ID', color: '#ffb500', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'haymans', name: 'Haymans', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.haymans.com.au', monogram: 'HY', color: '#00539f', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'mm_electrical', name: 'MM Electrical', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.mmem.com.au', monogram: 'MM', color: '#d22630', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'rexel', name: 'Rexel', trade: 'electrical', methods: ['api', 'catalogue', 'browser'], website: 'https://www.rexel.com.au', monogram: 'RX', color: '#00437b', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'lawrence_hanson', name: 'Lawrence & Hanson', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.lh.com.au', monogram: 'LH', color: '#e4002b', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'awm', name: 'AWM Electrical', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.awmelectrical.com.au', monogram: 'AW', color: '#005eb8', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'tle', name: 'TLE Electrical', trade: 'electrical', methods: ['catalogue', 'browser'], website: 'https://www.tle.com.au', monogram: 'TL', color: '#f36f21', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'actrol', name: 'Actrol', trade: 'hvac', methods: ['catalogue', 'browser'], website: 'https://www.actrol.com.au', monogram: 'AC', color: '#00703c', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'samios', name: 'Samios', trade: 'hvac', methods: ['catalogue', 'browser'], website: 'https://www.samios.net.au', monogram: 'SA', color: '#1b365d', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'reece_hvac', name: 'Reece HVAC', trade: 'hvac', methods: ['api', 'catalogue', 'browser'], website: 'https://www.reece.com.au/hvac-r', monogram: 'RE', color: '#003057', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'kirby_hvac', name: 'Kirby HVAC&R', trade: 'hvac', methods: ['catalogue', 'browser'], website: 'https://www.kirbyhvacr.com.au', monogram: 'KB', color: '#cf102d', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'beijer_ref', name: 'Beijer Ref', trade: 'hvac', methods: ['catalogue', 'browser'], website: 'https://www.beijerref.com.au', monogram: 'BR', color: '#00427a', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  { key: 'aad', name: 'AAD (Australian Automation & Distribution)', trade: 'hvac', methods: ['catalogue', 'browser'], website: 'https://www.aad.com.au', monogram: 'AA', color: '#5b8a3c', supportsTradeAccounts: true, supportsPurchaseOrders: true },
  // Public-catalogue demo supplier (already live in the engine)
  { key: 'sparky_direct', name: 'Sparky Direct', trade: 'electrical', methods: ['api'], website: 'https://www.sparkydirect.com.au', monogram: 'SD', color: '#4a9c4a', supportsTradeAccounts: false, supportsPurchaseOrders: false },
]

export function getWholesaler(key: string): WholesalerInfo | undefined {
  return WHOLESALERS.find((w) => w.key === key)
}

export function wholesalerName(key: string): string {
  return getWholesaler(key)?.name ?? key.replace(/_/g, ' ')
}

export const METHOD_LABELS: Record<ConnectionMethod, string> = {
  api: 'Official API',
  catalogue: 'Catalogue feed',
  browser: 'Browser connector',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
  manual: 'Manual only',
}

export const FREQUENCY_DAYS: Record<string, number | null> = {
  daily: 1,
  weekly: 7,
  fortnightly: 14,
  monthly: 30,
  manual: null,
}

export function computeNextSync(frequency: string, from: Date = new Date()): string | null {
  const days = FREQUENCY_DAYS[frequency]
  if (days == null) return null
  return new Date(from.getTime() + days * 86400_000).toISOString()
}
