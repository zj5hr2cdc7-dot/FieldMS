/**
 * Stored membership role.
 *
 * 'owner' | 'manager' | 'technician' are current. 'admin' and 'member' are
 * the pre-migration-024 names, kept in the type so older rows and any code
 * still referencing them compiles. Always pass through normaliseRole() from
 * lib/roles.ts rather than comparing these strings directly.
 */
export type UserRole = 'owner' | 'manager' | 'technician' | 'admin' | 'member'

export interface Tenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  google_reviews_url: string | null
  abn: string | null
  phone: string | null
  website: string | null
  work_day_start: string | null
  work_day_end: string | null
  working_days: number[] | null
  created_at: string
  updated_at: string
}

export interface TenantMember {
  id: string
  tenant_id: string
  user_id: string
  role: UserRole
  skills: string[]
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  default_tenant_id: string | null
  phone: string | null
  emergency_contact: string | null
  vehicle: string | null
  qualifications: string[] | null
  licences: string[] | null
  created_at: string
  updated_at: string
}

export interface Estimate {
  id: string
  business_id: string
  job_id: string | null
  customer_name: string
  status: string
  total: number
  public_token: string | null
  customer_email: string | null
  customer_phone: string | null
  deposit_percent: number
  approved_at: string | null
  declined_at: string | null
  approval_name: string | null
  approval_note: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

export type EstimateApprovalEventType = 'viewed' | 'approved' | 'declined'

export interface EstimateApprovalEvent {
  id: string
  estimate_id: string
  event_type: EstimateApprovalEventType
  actor_name: string | null
  note: string | null
  user_agent: string | null
  created_at: string
}

export interface EstimateItem {
  id: string
  estimate_id: string
  name: string
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

export interface EquipmentItem {
  id: string
  supplier: string
  category: string
  name: string
  sku: string
  basePrice: number
}

export type JobStatus = 'open' | 'in_progress' | 'completed' | 'cancelled'
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'
export type JobEventType = 'travel_started' | 'job_started' | 'job_completed'

export type JobRecurrence = 'none' | 'weekly' | 'fortnightly' | 'monthly'

export interface Job {
  id: string
  tenant_id: string
  title: string
  description: string | null
  status: JobStatus
  priority: JobPriority
  estimated_hours: number | null
  due_date: string | null
  scheduled_start: string | null
  recurrence: JobRecurrence
  recurrence_until: string | null
  recurrence_parent_id: string | null
  quote_total: number
  gst_rate: number
  po_number: string | null
  billing_notes: string | null
  created_by: string
  assigned_to: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  created_at: string
  updated_at: string
}

export interface JobEvent {
  id: string
  job_id: string
  tenant_id: string
  event_type: JobEventType
  created_by: string | null
  created_at: string
}

export interface JobLocationUpdate {
  id: string
  job_id: string
  tenant_id: string
  lat: number
  lng: number
  accuracy: number | null
  recorded_at: string
}

export interface JobTrackingToken {
  id: string
  job_id: string
  token: string
  created_at: string
}

export interface JobAssignment {
  id: string
  job_id: string
  user_id: string
  assigned_at: string
}

export interface JobPlan {
  id: string
  tenant_id: string
  job_id: string | null
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string | null
  created_at: string
}

export type BillingItemKind = 'labour' | 'material'

export interface JobBillingItem {
  id: string
  job_id: string
  tenant_id: string
  kind: BillingItemKind
  description: string
  hours: number
  rate_per_hour: number
  quantity: number | null
  unit_cost: number | null
  master_product_id: string | null
  price_source: string | null
  markup_percent: number
  revenue: number
  cost: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// ── Test sheets & certificates ─────────────────────────────────────────────

export interface TestSheetCircuit {
  circuit_ref: string
  description: string
  cable_size: string
  protection_type: string
  protection_rating: string
  earth_continuity_ohms: string
  insulation_resistance_mohms: string
  polarity_pass: boolean | null
  rcd_trip_ms: string
  rcd_trip_ma: string
  visual_pass: boolean | null
  notes: string
}

export type TestSheetStatus = 'draft' | 'completed'

export interface JobTestSheet {
  id: string
  tenant_id: string
  job_id: string
  status: TestSheetStatus
  installation_address: string | null
  switchboard_location: string | null
  supply_type: string | null
  circuits: TestSheetCircuit[]
  certificate_number: string | null
  certificate_token: string | null
  tested_by: string | null
  tester_name: string | null
  tester_license: string | null
  test_date: string | null
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Payments & accounting sync ─────────────────────────────────────────────

export type PaymentKind = 'deposit' | 'payment' | 'refund'

export interface JobPayment {
  id: string
  tenant_id: string
  job_id: string
  estimate_id: string | null
  kind: PaymentKind
  amount: number
  method: string | null
  reference: string | null
  received_at: string
  created_by: string | null
  created_at: string
}

export type SyncEntityType = 'invoice' | 'payment' | 'contact'
export type SyncStatus = 'pending' | 'synced' | 'error'

export interface AccountingSyncRecord {
  id: string
  tenant_id: string
  provider: IntegrationProvider
  entity_type: SyncEntityType
  entity_id: string
  idempotency_key: string
  external_id: string | null
  status: SyncStatus
  last_error: string | null
  attempts: number
  payload_hash: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

// ── Photos & site reports ──────────────────────────────────────────────────

export interface JobPhoto {
  id: string
  tenant_id: string
  job_id: string
  file_path: string
  caption: string | null
  taken_at: string
  uploaded_by: string | null
  created_at: string
}

export interface JobReport {
  id: string
  tenant_id: string
  job_id: string
  token: string
  title: string
  summary: string | null
  photo_ids: string[]
  sent_at: string | null
  created_by: string | null
  created_at: string
}

export type IntegrationProvider = 'xero' | 'myob'

export interface Integration {
  id: string
  tenant_id: string
  provider: IntegrationProvider
  status: 'connected' | 'disconnected'
  external_account_id: string | null
  external_account_name: string | null
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  scopes: string | null
  connected_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
  email_confirmed_at: string | null
  phone: string | null
  last_sign_in_at: string | null
  app_metadata: {
    provider?: string
    providers?: string[]
  }
  user_metadata: {
    full_name?: string
    avatar_url?: string
  }
  aud: string
  created_at: string
  updated_at: string
}

export interface AuthSession {
  user: AuthUser | null
  profile: Profile | null
  tenant: Tenant | null
  role: UserRole | null
}
