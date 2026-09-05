/**
 * Pure trade logic — safe to import from both client components and server
 * routes (no Supabase / browser dependencies).
 */

export type TradeKey =
  | 'electrical'
  | 'hvac'
  | 'solar'
  | 'air_con'
  | 'data_comms'
  | 'security'
  | 'automation'
  | 'other'

/**
 * Trades that use the electrical toolset: FieldMS Fault Finder, AS/NZS 3000
 * reference and electrical test sheets. Solar, data, security and automation
 * are all electrical licence work, so they qualify.
 */
export const ELECTRICAL_TRADES: TradeKey[] = ['electrical', 'solar', 'data_comms', 'security', 'automation']

/**
 * Trades that do NOT get the Fault Finder. FieldMS Fault Finder is an
 * electrical product: the manual behind it is the electrical edition and the
 * persona refuses refrigeration work, so HVAC and air conditioning businesses
 * are not offered it at all.
 */
export const HVAC_TRADES: TradeKey[] = ['hvac', 'air_con']

export function hasElectrical(trades: string[]): boolean {
  return trades.some((t) => ELECTRICAL_TRADES.includes(t as TradeKey))
}

export function hasHvac(trades: string[]): boolean {
  return trades.some((t) => HVAC_TRADES.includes(t as TradeKey))
}

/**
 * Whether a business may use FieldMS Fault Finder.
 *
 * A workspace with no trades recorded yet (mid-onboarding, or created before
 * trade selection existed) is allowed through — gating an empty profile would
 * lock people out of the product they just signed up for. Once trades are
 * saved, only electrical trades qualify.
 */
export function canUseFaultFinder(trades: string[]): boolean {
  if (!trades.length) return true
  return hasElectrical(trades)
}
