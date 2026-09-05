// ── Forms & Compliance module types ─────────────────────────────────────────

export type FormFieldType =
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'email'
  | 'phone'
  | 'address'
  | 'date'
  | 'time'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'toggle'
  | 'passfail'
  | 'photo'
  | 'file'
  | 'table'
  | 'gps'
  | 'calculated'
  | 'signature'
  | 'initials'

export type AutofillKey =
  | 'job.title'
  | 'job.number'
  | 'job.description'
  | 'job.customer_name'
  | 'job.customer_phone'
  | 'job.customer_email'
  | 'job.customer_address'
  | 'job.due_date'
  | 'business.name'
  | 'business.trading_name'
  | 'business.abn'
  | 'business.acn'
  | 'business.phone'
  | 'business.license'
  | 'business.electrical_license'
  | 'technician.name'
  | 'technician.email'
  | 'date.today'
  | 'time.now'
  | 'gps.current'

export type SignatureRole = 'technician' | 'supervisor' | 'customer' | 'property_owner' | 'site_manager'

export interface FormTableColumn {
  key: string
  label: string
  type: 'text' | 'number' | 'passfail'
}

export interface FormFieldCondition {
  fieldId: string
  equals: string | boolean
}

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  helpText?: string
  required?: boolean
  options?: string[]                 // select / multiselect / radio
  columns?: FormTableColumn[]        // table / repeating section
  minRows?: number                   // table
  autofill?: AutofillKey
  formula?: string                   // calculated fields, e.g. "qty * rate"
  condition?: FormFieldCondition     // conditional visibility
  signatureRole?: SignatureRole
  defaultValue?: string | number | boolean
}

export interface FormTemplateSchema {
  fields: FormField[]
}

export type FormTemplateCategory = 'electrical' | 'safety' | 'general' | 'hr' | 'assets'

export interface FormTemplate {
  id: string
  tenant_id: string | null           // null = system/library template
  name: string
  category: FormTemplateCategory
  description: string | null
  doc_prefix: string
  schema: FormTemplateSchema
  version: number
  auto_on_job_complete: boolean
  archived: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type FormSubmissionStatus = 'draft' | 'awaiting_signature' | 'completed' | 'approved' | 'rejected'

export type FormFieldValue = string | number | boolean | string[] | Record<string, string>[] | null

export interface FormSubmission {
  id: string
  tenant_id: string
  template_id: string | null
  template_name: string
  template_schema: FormTemplateSchema
  job_id: string | null
  status: FormSubmissionStatus
  data: Record<string, FormFieldValue>
  doc_number: string | null
  public_token: string | null
  revision: number
  gps_lat: number | null
  gps_lng: number | null
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface FormSignature {
  id: string
  submission_id: string
  tenant_id: string
  role: SignatureRole
  signer_name: string
  signature_data: string             // PNG data URL
  signed_at: string
  user_agent: string | null
}

export interface FormAuditEvent {
  id: string
  submission_id: string
  tenant_id: string
  event_type: string
  actor_name: string | null
  meta: Record<string, unknown>
  created_at: string
}

// ── Branding ────────────────────────────────────────────────────────────────

export interface TenantBranding {
  tenant_id: string
  trading_name: string | null
  acn: string | null
  license_number: string | null
  contractor_license: string | null
  electrical_license: string | null
  postal_address: string | null
  business_address: string | null
  social_links: Record<string, string>
  primary_color: string
  secondary_color: string
  accent_color: string
  font_family: string
  logo_path: string | null
  watermark_path: string | null
  header_image_path: string | null
  footer_image_path: string | null
  stamp_path: string | null
  logo_position: 'left' | 'center' | 'right'
  paper_size: 'A4' | 'Letter'
  show_page_numbers: boolean
  show_watermark: boolean
  doc_number_format: string
  email_signature: string | null
  footer_text: string | null
  created_at: string
  updated_at: string
}

/** Library template definition (lives in code; copied into a tenant on use). */
export interface LibraryTemplate {
  key: string
  name: string
  category: FormTemplateCategory
  description: string
  doc_prefix: string
  schema: FormTemplateSchema
}
