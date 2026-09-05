/**
 * Customers, sites and the marketing list.
 *
 * Before this existed, a customer was four free text columns repeated on
 * every job. These helpers work against the real `customers` and `sites`
 * tables introduced in migration 023, which is what makes job history,
 * repeat business and email marketing possible at all.
 *
 * Every query is tenant scoped by RLS, so the tenant id passed here is for
 * index selectivity and clarity, not security.
 */

import { createClient } from '@/utils/supabase/client'

export type CustomerKind = 'residential' | 'commercial' | 'strata' | 'builder' | 'agent' | 'other'

/**
 * Marketing consent, modelled on the Australian Spam Act 2003.
 *
 * - express: they actively opted in, and you can show when and where
 * - implied: an existing business relationship, lawful but weaker
 * - declined: asked not to be marketed to
 * - unsubscribed: opted out of a campaign
 *
 * Only express and implied are ever exportable.
 */
export type MarketingConsent = 'express' | 'implied' | 'declined' | 'unsubscribed'

export const CUSTOMER_KINDS: { key: CustomerKind; label: string }[] = [
  { key: 'residential', label: 'Residential' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'strata', label: 'Strata' },
  { key: 'builder', label: 'Builder' },
  { key: 'agent', label: 'Real estate agent' },
  { key: 'other', label: 'Other' },
]

export interface Customer {
  id: string
  tenant_id: string
  name: string
  kind: CustomerKind
  email: string | null
  phone: string | null
  billing_address: string | null
  abn: string | null
  notes: string | null
  match_key: string
  marketing_consent: MarketingConsent
  marketing_consent_at: string | null
  marketing_consent_source: string | null
  unsubscribe_token: string
  unsubscribed_at: string | null
  last_marketed_at: string | null
  archived: boolean
  created_at: string
  updated_at: string
}

export interface Site {
  id: string
  tenant_id: string
  customer_id: string
  label: string | null
  address: string
  access_notes: string | null
  switchboard_location: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

/** A row of the marketing list view: customer plus spend and recency. */
export interface MarketingRow {
  id: string
  tenant_id: string
  name: string
  email: string
  phone: string | null
  kind: CustomerKind
  marketing_consent: MarketingConsent
  unsubscribe_token: string
  last_marketed_at: string | null
  job_count: number
  last_job_at: string | null
  first_job_at: string | null
  lifetime_value: number
  is_lapsed: boolean
}

// ── Customers ───────────────────────────────────────────────

export async function listCustomers(
  tenantId: string,
  opts: { search?: string; includeArchived?: boolean } = {}
): Promise<Customer[]> {
  const supabase = createClient()
  let q = supabase
    .from('customers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name')

  if (!opts.includeArchived) q = q.eq('archived', false)
  if (opts.search?.trim()) {
    const term = `%${opts.search.trim()}%`
    q = q.or(`name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Customer[]
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle()
  if (error) throw error
  return data as Customer | null
}

export async function upsertCustomer(
  tenantId: string,
  patch: Partial<Customer> & { name: string }
): Promise<Customer> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customers')
    .upsert({ tenant_id: tenantId, ...patch }, { onConflict: 'id' })
    .select()
    .single()
  if (error) throw error
  return data as Customer
}

/**
 * Record a consent decision with a timestamp and a source.
 *
 * Consent without provenance is not much use if anyone ever asks, so the
 * source is required rather than optional.
 */
export async function setMarketingConsent(
  customerId: string,
  consent: MarketingConsent,
  source: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('customers')
    .update({
      marketing_consent: consent,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_source: source,
      unsubscribed_at: consent === 'unsubscribed' ? new Date().toISOString() : null,
    })
    .eq('id', customerId)
  if (error) throw error
}

// ── Sites ───────────────────────────────────────────────────

export async function listSites(customerId: string): Promise<Site[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('customer_id', customerId)
    .order('address')
  if (error) throw error
  return (data ?? []) as Site[]
}

// ── Job history ─────────────────────────────────────────────

export interface CustomerJob {
  id: string
  title: string
  status: string
  created_at: string
  due_date: string | null
  quote_total: number
  customer_address: string | null
}

export async function listCustomerJobs(customerId: string): Promise<CustomerJob[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, status, created_at, due_date, quote_total, customer_address')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as CustomerJob[]
}

// ── Marketing ───────────────────────────────────────────────

export type Segment = 'all' | 'lapsed' | 'high_value' | 'recent' | 'commercial' | 'never_marketed'

export const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: 'all', label: 'Everyone', hint: 'All consented customers with an email address' },
  { key: 'lapsed', label: 'Lapsed', hint: 'No job in over 12 months. Usually the cheapest work to win back' },
  { key: 'high_value', label: 'High value', hint: 'Top spenders by lifetime invoiced total' },
  { key: 'recent', label: 'Recent', hint: 'Worked with in the last 90 days. Good for review requests' },
  { key: 'commercial', label: 'Commercial', hint: 'Commercial, strata, builders and agents' },
  { key: 'never_marketed', label: 'Never emailed', hint: 'Consented but never included in a campaign' },
]

export async function listMarketingCustomers(tenantId: string): Promise<MarketingRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_marketing_list')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('lifetime_value', { ascending: false })
  if (error) throw error
  return (data ?? []).map((r) => ({
    ...(r as MarketingRow),
    lifetime_value: Number((r as MarketingRow).lifetime_value ?? 0),
    job_count: Number((r as MarketingRow).job_count ?? 0),
  }))
}

const DAY = 24 * 60 * 60 * 1000

/** Filter the list client side. The dataset is small enough that a round trip per segment is not worth it. */
export function applySegment(rows: MarketingRow[], segment: Segment): MarketingRow[] {
  switch (segment) {
    case 'lapsed':
      return rows.filter((r) => r.is_lapsed)
    case 'high_value': {
      const withSpend = rows.filter((r) => r.lifetime_value > 0)
      const sorted = [...withSpend].sort((a, b) => b.lifetime_value - a.lifetime_value)
      // Top quartile, but always offer something useful on a small list.
      return sorted.slice(0, Math.max(10, Math.ceil(sorted.length / 4)))
    }
    case 'recent':
      return rows.filter(
        (r) => r.last_job_at && Date.now() - new Date(r.last_job_at).getTime() < 90 * DAY
      )
    case 'commercial':
      return rows.filter((r) => ['commercial', 'strata', 'builder', 'agent'].includes(r.kind))
    case 'never_marketed':
      return rows.filter((r) => !r.last_marketed_at)
    default:
      return rows
  }
}

/**
 * Build a CSV for Mailchimp, Resend, Campaign Monitor or a mail merge.
 *
 * The unsubscribe token is included deliberately: a campaign needs a working
 * unsubscribe link, and merging `/unsubscribe/<token>` into the footer is the
 * simplest way to make one that actually writes back here.
 */
export function toCsv(rows: MarketingRow[], origin: string): string {
  const headers = [
    'name',
    'email',
    'phone',
    'type',
    'consent',
    'jobs',
    'lifetime_value',
    'last_job',
    'unsubscribe_url',
  ]

  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = rows.map((r) =>
    [
      r.name,
      r.email,
      r.phone ?? '',
      r.kind,
      r.marketing_consent,
      r.job_count,
      r.lifetime_value.toFixed(2),
      r.last_job_at ? r.last_job_at.slice(0, 10) : '',
      `${origin}/unsubscribe/${r.unsubscribe_token}`,
    ]
      .map(escape)
      .join(',')
  )

  return [headers.join(','), ...lines].join('\n')
}

/** Stamp everyone in an export so the "never emailed" segment stays meaningful. */
export async function markMarketed(customerIds: string[]): Promise<void> {
  if (!customerIds.length) return
  const supabase = createClient()
  const { error } = await supabase
    .from('customers')
    .update({ last_marketed_at: new Date().toISOString() })
    .in('id', customerIds)
  if (error) throw error
}

// ── Formatting ──────────────────────────────────────────────

export function formatMoney(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
}

export function formatWhen(iso: string | null): string {
  if (!iso) return 'Never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? 'A year ago' : `${years} years ago`
}
