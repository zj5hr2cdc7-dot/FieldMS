/**
 * Forms & Compliance engine.
 * Template CRUD, submission lifecycle, smart autofill, document numbering,
 * conditional logic, calculated fields, and the audit trail.
 */

import { createClient } from '@/utils/supabase/client'
import type { Job, Tenant } from '@/types/database'
import type {
  AutofillKey,
  FormField,
  FormFieldValue,
  FormSignature,
  FormSubmission,
  FormSubmissionStatus,
  FormTemplate,
  FormTemplateSchema,
  SignatureRole,
  TenantBranding,
} from '@/types/forms'

// ── Templates ───────────────────────────────────────────────────────────────

export async function getTemplates(tenantId: string): Promise<FormTemplate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('name')
  if (error) throw error
  return (data || []) as FormTemplate[]
}

export async function getTemplate(templateId: string): Promise<FormTemplate | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('form_templates').select('*').eq('id', templateId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as FormTemplate
}

export async function createTemplate(
  tenantId: string,
  userId: string,
  input: {
    name: string
    category: string
    description?: string
    doc_prefix?: string
    schema: FormTemplateSchema
    auto_on_job_complete?: boolean
  }
): Promise<FormTemplate> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_templates')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      category: input.category,
      description: input.description ?? null,
      doc_prefix: input.doc_prefix || 'DOC',
      schema: input.schema,
      auto_on_job_complete: input.auto_on_job_complete ?? false,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  return data as FormTemplate
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<Pick<FormTemplate, 'name' | 'category' | 'description' | 'doc_prefix' | 'schema' | 'auto_on_job_complete' | 'archived'>>
): Promise<FormTemplate> {
  const supabase = createClient()
  // Bump version on schema changes so issued documents can reference it
  const patch: Record<string, unknown> = { ...updates }
  const { data, error } = await supabase
    .from('form_templates')
    .update(patch)
    .eq('id', templateId)
    .select()
    .single()
  if (error) throw error
  return data as FormTemplate
}

export async function duplicateTemplate(template: FormTemplate, tenantId: string, userId: string): Promise<FormTemplate> {
  return createTemplate(tenantId, userId, {
    name: `${template.name} (copy)`,
    category: template.category,
    description: template.description ?? undefined,
    doc_prefix: template.doc_prefix,
    schema: template.schema,
  })
}

// ── Smart autofill ──────────────────────────────────────────────────────────

export interface AutofillContext {
  job?: Job | null
  tenant?: Tenant | null
  branding?: TenantBranding | null
  technicianName?: string | null
  technicianEmail?: string | null
}

export function resolveAutofill(key: AutofillKey, ctx: AutofillContext): FormFieldValue {
  const { job, tenant, branding } = ctx
  switch (key) {
    case 'job.title': return job?.title ?? null
    case 'job.number': return job ? `J-${job.id.slice(0, 8).toUpperCase()}` : null
    case 'job.description': return job?.description ?? null
    case 'job.customer_name': return job?.customer_name ?? null
    case 'job.customer_phone': return job?.customer_phone ?? null
    case 'job.customer_email': return job?.customer_email ?? null
    case 'job.customer_address': return job?.customer_address ?? null
    case 'job.due_date': return job?.due_date?.slice(0, 10) ?? null
    case 'business.name': return tenant?.name ?? null
    case 'business.trading_name': return branding?.trading_name ?? tenant?.name ?? null
    case 'business.abn': return tenant?.abn ?? null
    case 'business.acn': return branding?.acn ?? null
    case 'business.phone': return tenant?.phone ?? null
    case 'business.license': return branding?.license_number ?? null
    case 'business.electrical_license': return branding?.electrical_license ?? null
    case 'technician.name': return ctx.technicianName ?? null
    case 'technician.email': return ctx.technicianEmail ?? null
    case 'date.today': return new Date().toISOString().slice(0, 10)
    case 'time.now': return new Date().toTimeString().slice(0, 5)
    case 'gps.current': return null // filled asynchronously by the fill page
    default: return null
  }
}

/** Pre-populates submission data from autofill keys. No manual retyping. */
export function buildAutofillData(schema: FormTemplateSchema, ctx: AutofillContext): Record<string, FormFieldValue> {
  const data: Record<string, FormFieldValue> = {}
  for (const field of schema.fields) {
    if (field.autofill) {
      const value = resolveAutofill(field.autofill, ctx)
      if (value !== null) data[field.id] = value
    } else if (field.defaultValue !== undefined) {
      data[field.id] = field.defaultValue
    }
  }
  return data
}

// ── Conditional logic & calculated fields ──────────────────────────────────

export function isFieldVisible(field: FormField, data: Record<string, FormFieldValue>): boolean {
  if (!field.condition) return true
  const actual = data[field.condition.fieldId]
  return actual === field.condition.equals
}

/**
 * Evaluates a calculated-field formula like "qty * rate + 10".
 * Only field ids, numbers, + - * / ( ) are permitted — no eval().
 */
export function evaluateFormula(formula: string, data: Record<string, FormFieldValue>): number | null {
  const substituted = formula.replace(/[a-zA-Z_][a-zA-Z0-9_-]*/g, (name) => {
    const value = data[name]
    const num = typeof value === 'number' ? value : parseFloat(String(value ?? ''))
    return Number.isFinite(num) ? String(num) : '0'
  })
  if (!/^[\d\s+\-*/().]+$/.test(substituted)) return null
  try {
    // Safe: input restricted to arithmetic characters above
    const result = new Function(`return (${substituted})`)() as number
    return Number.isFinite(result) ? Math.round(result * 100) / 100 : null
  } catch {
    return null
  }
}

// ── Document numbering ──────────────────────────────────────────────────────

export async function issueDocumentNumber(
  tenantId: string,
  docPrefix: string,
  format: string
): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('next_document_number', {
    p_tenant_id: tenantId,
    p_prefix: docPrefix,
  })
  if (error) throw error
  const seq = Number(data)
  const now = new Date()
  return (format || '{PREFIX}-{YYYY}-{SEQ4}')
    .replace('{PREFIX}', docPrefix)
    .replace('{YYYY}', String(now.getFullYear()))
    .replace('{YY}', String(now.getFullYear()).slice(2))
    .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
    .replace('{SEQ4}', String(seq).padStart(4, '0'))
    .replace('{SEQ}', String(seq))
}

// ── Submissions ─────────────────────────────────────────────────────────────

export async function getSubmissions(tenantId: string): Promise<FormSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data || []) as FormSubmission[]
}

export async function getSubmission(submissionId: string): Promise<FormSubmission | null> {
  const supabase = createClient()
  const { data, error } = await supabase.from('form_submissions').select('*').eq('id', submissionId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as FormSubmission
}

export async function createSubmission(
  template: FormTemplate,
  tenantId: string,
  userId: string,
  ctx: AutofillContext,
  jobId?: string
): Promise<FormSubmission> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_submissions')
    .insert({
      tenant_id: tenantId,
      template_id: template.id,
      template_name: template.name,
      template_schema: template.schema,
      job_id: jobId ?? null,
      data: buildAutofillData(template.schema, ctx),
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error
  const submission = data as FormSubmission
  await logAudit(submission.id, tenantId, 'created', ctx.technicianName ?? null, { template: template.name })
  return submission
}

export async function saveSubmissionData(
  submissionId: string,
  data: Record<string, FormFieldValue>,
  gps?: { lat: number; lng: number } | null
): Promise<FormSubmission> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { data }
  if (gps) {
    patch.gps_lat = gps.lat
    patch.gps_lng = gps.lng
  }
  const { data: row, error } = await supabase
    .from('form_submissions')
    .update(patch)
    .eq('id', submissionId)
    .select()
    .single()
  if (error) throw error
  return row as FormSubmission
}

export function validateSubmission(
  schema: FormTemplateSchema,
  data: Record<string, FormFieldValue>
): { fieldId: string; label: string }[] {
  const missing: { fieldId: string; label: string }[] = []
  for (const field of schema.fields) {
    if (!field.required || !isFieldVisible(field, data)) continue
    if (field.type === 'signature' || field.type === 'initials') continue // checked via signatures table
    const value = data[field.id]
    const empty =
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    if (empty) missing.push({ fieldId: field.id, label: field.label })
  }
  return missing
}

export async function completeSubmission(
  submission: FormSubmission,
  docPrefix: string,
  numberFormat: string,
  actorName: string | null
): Promise<FormSubmission> {
  const missing = validateSubmission(submission.template_schema, submission.data)
  if (missing.length > 0) {
    throw new Error(`Required fields missing: ${missing.map((m) => m.label).join(', ')}`)
  }

  const supabase = createClient()
  const docNumber = submission.doc_number ?? (await issueDocumentNumber(submission.tenant_id, docPrefix, numberFormat))

  const { data, error } = await supabase
    .from('form_submissions')
    .update({
      status: 'completed' satisfies FormSubmissionStatus,
      doc_number: docNumber,
      completed_at: new Date().toISOString(),
      revision: submission.revision, // revision bumps happen on reopen
    })
    .eq('id', submission.id)
    .select()
    .single()
  if (error) throw error

  await logAudit(submission.id, submission.tenant_id, 'completed', actorName, { doc_number: docNumber })
  return data as FormSubmission
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('form_submissions').delete().eq('id', submissionId)
  if (error) throw error
}

// ── Signatures ──────────────────────────────────────────────────────────────

export async function getSignatures(submissionId: string): Promise<FormSignature[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('form_signatures').select('*').eq('submission_id', submissionId)
  if (error) throw error
  return (data || []) as FormSignature[]
}

export async function addSignature(
  submissionId: string,
  tenantId: string,
  role: SignatureRole,
  signerName: string,
  signatureData: string
): Promise<FormSignature> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_signatures')
    .upsert(
      {
        submission_id: submissionId,
        tenant_id: tenantId,
        role,
        signer_name: signerName,
        signature_data: signatureData,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      },
      { onConflict: 'submission_id,role' }
    )
    .select()
    .single()
  if (error) throw error
  await logAudit(submissionId, tenantId, 'signed', signerName, { role })
  return data as FormSignature
}

// ── Audit ───────────────────────────────────────────────────────────────────

export async function logAudit(
  submissionId: string,
  tenantId: string,
  eventType: string,
  actorName: string | null,
  meta: Record<string, unknown> = {}
): Promise<void> {
  const supabase = createClient()
  await supabase.from('form_audit_events').insert({
    submission_id: submissionId,
    tenant_id: tenantId,
    event_type: eventType,
    actor_name: actorName,
    meta,
  })
}

export async function getAuditTrail(submissionId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('form_audit_events')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Automation: auto-generate forms when a job completes ───────────────────

export async function autoGenerateFormsForJob(
  job: Job,
  tenantId: string,
  userId: string,
  ctx: AutofillContext
): Promise<number> {
  const supabase = createClient()
  const { data: templates, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('auto_on_job_complete', true)
    .eq('archived', false)
  if (error || !templates?.length) return 0

  // Skip templates that already have a submission for this job
  const { data: existing } = await supabase
    .from('form_submissions')
    .select('template_id')
    .eq('job_id', job.id)
  const existingTemplateIds = new Set((existing || []).map((r: { template_id: string | null }) => r.template_id))

  let created = 0
  for (const template of templates as FormTemplate[]) {
    if (existingTemplateIds.has(template.id)) continue
    await createSubmission(template, tenantId, userId, { ...ctx, job }, job.id)
    created += 1
  }
  return created
}

export function documentUrl(submission: Pick<FormSubmission, 'public_token'>): string | null {
  if (!submission.public_token) return null
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/document/${submission.public_token}`
}
