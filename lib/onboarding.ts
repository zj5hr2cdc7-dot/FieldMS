/**
 * Quick Start onboarding — state, trade selection and module gating.
 *
 * The trades a business selects during onboarding customise the whole app.
 * Electrical trades get the full toolset: FieldMS Fault Finder, AS/NZS 3000
 * reference and electrical test sheets. HVAC and air conditioning businesses
 * get the job management side of FieldMS without those electrical tools.
 */

import { createClient } from '@/utils/supabase/client'
import { hasElectrical, hasHvac, canUseFaultFinder, type TradeKey } from '@/lib/trades'

export { hasElectrical, hasHvac, canUseFaultFinder }
export type { TradeKey }

// ── Trades ──────────────────────────────────────────────────────────────────

export const TRADES: { key: TradeKey; label: string; icon: string; hint: string }[] = [
  { key: 'electrical', label: 'Electrical', icon: 'M13 10V3L4 14h7v7l9-11h-7z', hint: 'Fault Finder, AS/NZS 3000, certificates' },
  { key: 'hvac', label: 'HVAC / Refrigeration', icon: 'M9.5 4a2.5 2.5 0 1 1 2.5 2.5H2M12.5 20a2.5 2.5 0 1 0 2.5-2.5H2M17 6a2 2 0 1 1 2 2H2', hint: 'Jobs, quotes, scheduling and invoicing' },
  { key: 'air_con', label: 'Air Conditioning', icon: 'M12 3v18M5.6 5.6l12.8 12.8M3 12h18M5.6 18.4L18.4 5.6', hint: 'Split systems, ducted, maintenance' },
  { key: 'solar', label: 'Solar', icon: 'M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', hint: 'Installs, inverters, compliance' },
  { key: 'data_comms', label: 'Data & Communications', icon: 'M5 12.55a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M2 9a16 16 0 0 1 20 0M12 20h.01', hint: 'Structured cabling, NBN, networks' },
  { key: 'security', label: 'Security', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', hint: 'Alarms, CCTV, access control' },
  { key: 'automation', label: 'Automation', icon: 'M12 2v4m0 12v4M2 12h4m12 0h4M7 7l2 2m6 6 2 2m0-10-2 2M9 15l-2 2', hint: 'Smart homes, controls, BMS' },
  { key: 'other', label: 'Other', icon: 'M14 7a4 4 0 0 1-5 5l-6 6 2 2 6-6a4 4 0 0 1 5-5l-3-3 1-1z', hint: 'General trades work' },
]

// ── Module gating ───────────────────────────────────────────────────────────

export interface ModuleGate {
  /** Navbar hrefs hidden for this business. */
  hiddenNavHrefs: string[]
  /** Label overrides, e.g. the assistant link. */
  navLabelOverrides: Record<string, string>
  /** Whether this business can use FieldMS Fault Finder. */
  faultFinder: boolean
}

/** Routes that only exist for businesses doing electrical work. */
const ELECTRICAL_ONLY_ROUTES = ['/dashboard/test-sheets', '/dashboard/assistant', '/field/assistant']

/**
 * Decide what to hide or rename based on trades.
 *
 * FieldMS Fault Finder is an electrical product. HVAC and air conditioning
 * businesses don't see it, or the electrical test sheets that go with it —
 * the links are hidden here and the routes themselves refuse access.
 */
export function moduleGate(trades: string[]): ModuleGate {
  const faultFinder = canUseFaultFinder(trades)
  const gate: ModuleGate = { hiddenNavHrefs: [], navLabelOverrides: {}, faultFinder }

  if (!faultFinder) {
    gate.hiddenNavHrefs = [...ELECTRICAL_ONLY_ROUTES]
  } else {
    gate.navLabelOverrides['/dashboard/assistant'] = 'Fault Finder'
    gate.navLabelOverrides['/field/assistant'] = 'Fault Finder'
  }
  return gate
}

// ── Wizard steps ────────────────────────────────────────────────────────────

export type OnboardingStep =
  | 'business'
  | 'trades'
  | 'branding'
  | 'wholesalers'
  | 'integrations'
  | 'team'
  | 'tour'

export const STEP_LABELS: Record<OnboardingStep, string> = {
  business: 'Business',
  trades: 'Trades',
  branding: 'Branding',
  wholesalers: 'Wholesalers',
  integrations: 'Integrations',
  team: 'Team',
  tour: 'Tutorial',
}

export const STEP_ORDER: OnboardingStep[] = [
  'business',
  'trades',
  'branding',
  'wholesalers',
  'integrations',
  'team',
  'tour',
]

// ── State ───────────────────────────────────────────────────────────────────

export interface OnboardingState {
  tenant_id: string
  trades: string[]
  business_size: 'solo' | 'small' | 'medium' | 'large' | null
  gst_registered: boolean | null
  timezone: string | null
  currency: string
  address: string | null
  business_email: string | null
  wholesaler_keys: string[]
  accounting_provider: 'xero' | 'myob' | 'quickbooks' | 'none' | 'later' | null
  completed_steps: string[]
  status: 'pending' | 'in_progress' | 'skipped' | 'completed'
  tour_completed: boolean
  completed_at: string | null
  updated_at: string
}

export async function getOnboarding(tenantId: string): Promise<OnboardingState | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenant_onboarding')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (error) throw error
  return data as OnboardingState | null
}

export async function saveOnboarding(
  tenantId: string,
  patch: Partial<Omit<OnboardingState, 'tenant_id' | 'updated_at'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('tenant_onboarding')
    .upsert({ tenant_id: tenantId, ...patch }, { onConflict: 'tenant_id' })
  if (error) throw error
}

export async function markStepDone(tenantId: string, step: OnboardingStep, current: string[]): Promise<string[]> {
  const next = current.includes(step) ? current : [...current, step]
  await saveOnboarding(tenantId, { completed_steps: next, status: 'in_progress' })
  return next
}

export async function completeOnboarding(tenantId: string): Promise<void> {
  await saveOnboarding(tenantId, { status: 'completed', completed_at: new Date().toISOString() })
}

export async function skipOnboarding(tenantId: string): Promise<void> {
  await saveOnboarding(tenantId, { status: 'skipped' })
}

/**
 * Whether the owner should be sent to setup before anything else loads.
 *
 * Setup is the front door: a business owner lands there first so quotes,
 * invoices and certificates are not produced from an unconfigured workspace.
 * It is not a prison, though. Skipping records 'skipped' and lets them
 * through, and Setup stays in the More menu to finish whenever they like.
 * Only a workspace that has never engaged with setup gets redirected.
 */
export function needsSetup(state: OnboardingState | null): boolean {
  return !state || state.status === 'pending'
}

/** Setup started or skipped but not finished, so it is worth nudging. */
export function setupIncomplete(state: OnboardingState | null): boolean {
  return state?.status !== 'completed'
}

// Small cache so the navbar doesn't refetch on every render
let gateCache: { tenantId: string; trades: string[] } | null = null

export async function getTradesCached(tenantId: string): Promise<string[]> {
  if (gateCache?.tenantId === tenantId) return gateCache.trades
  try {
    const state = await getOnboarding(tenantId)
    const trades = state?.trades ?? []
    gateCache = { tenantId, trades }
    return trades
  } catch {
    return []
  }
}

export function invalidateTradesCache(): void {
  gateCache = null
}
