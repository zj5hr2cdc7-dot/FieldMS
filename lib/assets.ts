/**
 * Assets and the compliance register.
 *
 * The commercial point of this module: an asset that is overdue for testing
 * is work the business is entitled to bill for and has not quoted. Grouping
 * the register by customer and totalling the typical test value turns a
 * compliance list into a call list.
 */

import { createClient } from '@/utils/supabase/client'

export interface AssetType {
  key: string
  label: string
  default_interval_months: number | null
  standard_ref: string | null
  sort_order: number
}

export interface Asset {
  id: string
  tenant_id: string
  customer_id: string | null
  site_id: string | null
  asset_type: string
  label: string
  location_note: string | null
  make: string | null
  model: string | null
  serial_number: string | null
  install_date: string | null
  rating: string | null
  test_interval_months: number | null
  last_tested_at: string | null
  next_test_due: string | null
  typical_test_value: number | null
  qr_token: string
  status: 'active' | 'decommissioned' | 'replaced'
  notes: string | null
  created_at: string
  updated_at: string
}

/** A row of the compliance register view. */
export interface RegisterRow {
  id: string
  tenant_id: string
  label: string
  asset_type: string
  asset_type_label: string | null
  standard_ref: string | null
  location_note: string | null
  make: string | null
  model: string | null
  serial_number: string | null
  status: string
  qr_token: string
  last_tested_at: string | null
  next_test_due: string | null
  typical_test_value: number | null
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  site_id: string | null
  site_address: string | null
  days_until_due: number | null
  is_overdue: boolean
  tests_recorded: number
}

export type DueFilter = 'overdue' | 'due_60' | 'upcoming' | 'unscheduled' | 'all'

export const DUE_FILTERS: { key: DueFilter; label: string; hint: string }[] = [
  { key: 'overdue', label: 'Overdue', hint: 'Past its test date. Billable work you have already earned the right to quote' },
  { key: 'due_60', label: 'Due in 60 days', hint: 'Coming up. The right time to ring and book it in' },
  { key: 'upcoming', label: 'Later', hint: 'Scheduled, more than 60 days out' },
  { key: 'unscheduled', label: 'No schedule', hint: 'No test interval set, so nothing will ever fall due' },
  { key: 'all', label: 'Everything', hint: 'Every active asset on the register' },
]

export async function listAssetTypes(): Promise<AssetType[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('asset_types').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as AssetType[]
}

export async function listRegister(tenantId: string): Promise<RegisterRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('compliance_register')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('next_test_due', { ascending: true, nullsFirst: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...(r as RegisterRow),
    typical_test_value: r.typical_test_value === null ? null : Number(r.typical_test_value),
    tests_recorded: Number((r as RegisterRow).tests_recorded ?? 0),
  }))
}

export function applyDueFilter(rows: RegisterRow[], filter: DueFilter): RegisterRow[] {
  switch (filter) {
    case 'overdue':
      return rows.filter((r) => r.is_overdue)
    case 'due_60':
      return rows.filter(
        (r) => !r.is_overdue && r.days_until_due !== null && r.days_until_due <= 60
      )
    case 'upcoming':
      return rows.filter((r) => r.days_until_due !== null && r.days_until_due > 60)
    case 'unscheduled':
      return rows.filter((r) => r.next_test_due === null)
    default:
      return rows
  }
}

/** Assets grouped by customer, so the register reads as a call list. */
export interface CustomerGroup {
  customerId: string | null
  customerName: string
  customerEmail: string | null
  assets: RegisterRow[]
  overdueCount: number
  value: number
}

export function groupByCustomer(rows: RegisterRow[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>()

  for (const r of rows) {
    const key = r.customer_id ?? '__unassigned__'
    let group = map.get(key)
    if (!group) {
      group = {
        customerId: r.customer_id,
        customerName: r.customer_name ?? 'No customer linked',
        customerEmail: r.customer_email,
        assets: [],
        overdueCount: 0,
        value: 0,
      }
      map.set(key, group)
    }
    group.assets.push(r)
    if (r.is_overdue) group.overdueCount += 1
    group.value += r.typical_test_value ?? 0
  }

  // Most valuable first: that is the order you would make the calls in.
  return [...map.values()].sort((a, b) => b.value - a.value || b.overdueCount - a.overdueCount)
}

/**
 * Total billable value sitting in a set of assets.
 *
 * Deliberately only counts assets with a typical value recorded, so the
 * number is never inflated by guessing. The UI says how many were excluded.
 */
export function pipelineValue(rows: RegisterRow[]): { total: number; priced: number; unpriced: number } {
  let total = 0
  let priced = 0
  let unpriced = 0
  for (const r of rows) {
    if (r.typical_test_value && r.typical_test_value > 0) {
      total += r.typical_test_value
      priced += 1
    } else {
      unpriced += 1
    }
  }
  return { total, priced, unpriced }
}

export async function upsertAsset(
  tenantId: string,
  patch: Partial<Asset> & { label: string; asset_type: string }
): Promise<Asset> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('assets')
    .upsert({ tenant_id: tenantId, ...patch }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data as Asset
}

/** Completed test sheets for one asset, newest first. This is the history. */
export interface AssetTest {
  id: string
  test_date: string | null
  completed_at: string | null
  certificate_number: string | null
  tester_name: string | null
  circuits: unknown
  notes: string | null
}

export async function listAssetTests(assetId: string): Promise<AssetTest[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_test_sheets')
    .select('id, test_date, completed_at, certificate_number, tester_name, circuits, notes')
    .eq('asset_id', assetId)
    .eq('status', 'completed')
    .order('test_date', { ascending: false })
  if (error) throw error
  return (data ?? []) as AssetTest[]
}

export function formatDue(days: number | null): string {
  if (days === null) return 'Not scheduled'
  if (days < 0) return `${Math.abs(days)} days overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 60) return `Due in ${days} days`
  const months = Math.round(days / 30)
  return `Due in ${months} months`
}
