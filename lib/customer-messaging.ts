/**
 * Server-side customer messaging: merge values for a job, sending a
 * templated message, and the automatic review request on job completion.
 *
 * SERVER ONLY. Uses the service-role client, so every exported function
 * assumes the caller has already authorised the request (lib/authz).
 *
 * WHY THE SERVER RENDERS THE MESSAGE
 *   The browser sends the template text; the server fills the merge fields
 *   from the database and picks the recipient from the job. A caller can't
 *   point a message at an arbitrary phone number, or slip another customer's
 *   invoice link into it, by editing the request.
 */

import { createAdminClient } from '@/utils/supabase/admin'
import { sendCustomerLink } from '@/lib/notifications'
import {
  builtIn,
  escapeHtml,
  firstName,
  formatMoney,
  missingFields,
  renderTemplate,
  textToEmailHtml,
  type MergeValues,
  type TemplateContent,
} from '@/lib/message-templates'

type Admin = ReturnType<typeof createAdminClient>

export interface JobMessageContext {
  job: {
    id: string
    tenant_id: string
    title: string
    customer_id: string | null
    customer_name: string | null
    customer_phone: string | null
    customer_email: string | null
    customer_address: string | null
    scheduled_start: string | null
    review_requested_at: string | null
  }
  tenant: {
    name: string
    phone: string | null
    google_reviews_url: string | null
    review_request_enabled: boolean | null
    review_request_sms: boolean | null
    review_request_email: boolean | null
  }
  businessName: string
  emailSignature: string | null
  values: MergeValues
  /** True when the linked customer has unsubscribed or declined. */
  customerOptedOut: boolean
}

export async function loadJobMessageContext(
  jobId: string,
  origin: string,
  senderUserId: string | null,
  admin: Admin = createAdminClient()
): Promise<JobMessageContext | null> {
  const { data: job } = await admin.from('jobs').select('*').eq('id', jobId).maybeSingle()
  if (!job) return null

  const [{ data: tenant }, { data: branding }, { data: profile }, { data: invoices }, { data: estimates }, { data: customer }] =
    await Promise.all([
      admin.from('tenants').select('*').eq('id', job.tenant_id).single(),
      admin.from('tenant_branding').select('trading_name, email_signature').eq('tenant_id', job.tenant_id).maybeSingle(),
      senderUserId
        ? admin.from('profiles').select('full_name').eq('id', senderUserId).maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .from('job_invoices')
        .select('invoice_number, status, total_inc_gst, amount_paid, public_token, created_at')
        .eq('job_id', jobId)
        .neq('status', 'void')
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(1),
      admin
        .from('estimates')
        .select('public_token, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1),
      job.customer_id
        ? admin.from('customers').select('marketing_consent').eq('id', job.customer_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

  if (!tenant) return null

  const businessName = branding?.trading_name || tenant.name || 'Your contractor'
  const invoice = invoices?.[0] ?? null
  const estimate = estimates?.[0] ?? null
  const owing = invoice ? Math.max(0, Number(invoice.total_inc_gst) - Number(invoice.amount_paid)) : null

  const values: MergeValues = {
    customer_first_name: firstName(job.customer_name),
    customer_name: job.customer_name || 'there',
    business_name: businessName,
    business_phone: tenant.phone,
    // Fall back to the business name so a template never reads "from  at".
    sender_name: firstName(profile?.full_name) === 'there' ? businessName : firstName(profile?.full_name),
    job_title: job.title,
    job_address: job.customer_address,
    scheduled_date: job.scheduled_start
      ? new Date(job.scheduled_start).toLocaleDateString('en-AU', {
          weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Australia/Brisbane',
        })
      : null,
    quote_link: estimate?.public_token ? `${origin}/quote/${estimate.public_token}` : null,
    invoice_link: invoice?.public_token ? `${origin}/invoice/${invoice.public_token}` : null,
    invoice_number: invoice?.invoice_number ?? null,
    amount_due: owing !== null ? formatMoney(owing) : null,
    review_link: tenant.google_reviews_url,
  }

  return {
    job,
    tenant,
    businessName,
    emailSignature: branding?.email_signature ?? null,
    values,
    customerOptedOut: customer?.marketing_consent === 'unsubscribed' || customer?.marketing_consent === 'declined',
  }
}

export interface RenderedMessage {
  subject: string
  sms: string
  emailText: string
  emailHtml: string
}

export function renderForJob(ctx: JobMessageContext, t: Pick<TemplateContent, 'subject' | 'sms_body' | 'email_body'>): RenderedMessage {
  const emailText = renderTemplate(t.email_body, ctx.values)
  const signature = ctx.emailSignature
    ? `<p style="color:#64748b;font-size:13px;white-space:pre-wrap">${escapeHtml(ctx.emailSignature)}</p>`
    : ''
  return {
    subject: renderTemplate(t.subject, ctx.values),
    sms: renderTemplate(t.sms_body, ctx.values),
    emailText,
    emailHtml: textToEmailHtml(emailText) + signature,
  }
}

/** Merge fields this template needs that this job can't supply. */
export function missingForJob(
  ctx: JobMessageContext,
  t: Pick<TemplateContent, 'subject' | 'sms_body' | 'email_body'>,
  channels: { sms: boolean; email: boolean }
): string[] {
  const texts = [channels.sms ? t.sms_body : '', channels.email ? t.subject : '', channels.email ? t.email_body : '']
  return missingFields(ctx.values, ...texts)
}

export async function sendAndLog({
  ctx,
  rendered,
  channels,
  templateKey,
  templateName,
  source,
  sentBy,
  admin = createAdminClient(),
}: {
  ctx: JobMessageContext
  rendered: RenderedMessage
  channels: { sms: boolean; email: boolean }
  templateKey: string | null
  templateName: string | null
  source: 'manual' | 'review_request_auto'
  sentBy: string | null
  admin?: Admin
}) {
  const toPhone = channels.sms ? ctx.job.customer_phone : null
  const toEmail = channels.email ? ctx.job.customer_email : null

  await sendCustomerLink({
    tenantId: ctx.job.tenant_id,
    businessName: ctx.businessName,
    customerPhone: toPhone,
    customerEmail: toEmail,
    subject: rendered.subject,
    text: rendered.sms,
    html: rendered.emailHtml,
  })

  await admin.from('customer_messages').insert({
    tenant_id: ctx.job.tenant_id,
    job_id: ctx.job.id,
    customer_id: ctx.job.customer_id,
    template_key: templateKey,
    template_name: templateName,
    source,
    to_phone: toPhone,
    to_email: toEmail,
    subject: toEmail ? rendered.subject : null,
    sms_body: toPhone ? rendered.sms : null,
    email_body: toEmail ? rendered.emailText : null,
    sent_by: sentBy,
  })
}

/** The review template a business uses: their edited copy, or the built-in. */
async function reviewTemplate(admin: Admin, tenantId: string): Promise<TemplateContent> {
  const fallback = builtIn('review_request')!
  const { data } = await admin
    .from('message_templates')
    .select('name, category, subject, sms_body, email_body, active')
    .eq('tenant_id', tenantId)
    .eq('template_key', 'review_request')
    .maybeSingle()
  return data && data.active ? (data as TemplateContent) : fallback
}

export type ReviewRequestOutcome =
  | 'sent'
  | 'disabled'
  | 'no_review_link'
  | 'already_requested'
  | 'no_contact'
  | 'opted_out'
  | 'not_completed'
  | 'not_found'

/**
 * Send the Google review request for a completed job, if the business has
 * switched it on. Idempotent: the review_requested_at claim is taken with a
 * conditional update first, so two completions racing each other (field app
 * and office at once) still send exactly one message.
 */
export async function maybeSendReviewRequest(jobId: string, origin: string, completedBy: string | null): Promise<ReviewRequestOutcome> {
  const admin = createAdminClient()
  const ctx = await loadJobMessageContext(jobId, origin, completedBy, admin)
  if (!ctx) return 'not_found'

  const { data: statusRow } = await admin.from('jobs').select('status').eq('id', jobId).single()
  if (statusRow?.status !== 'completed') return 'not_completed'
  if (!ctx.tenant.review_request_enabled) return 'disabled'
  if (!ctx.tenant.google_reviews_url) return 'no_review_link'
  if (ctx.job.review_requested_at) return 'already_requested'
  if (ctx.customerOptedOut) return 'opted_out'

  const channels = {
    sms: ctx.tenant.review_request_sms !== false && !!ctx.job.customer_phone,
    email: ctx.tenant.review_request_email !== false && !!ctx.job.customer_email,
  }
  if (!channels.sms && !channels.email) return 'no_contact'

  // Claim the job before sending. If another request got here first, the
  // update matches no rows and we stop.
  const { data: claimed } = await admin
    .from('jobs')
    .update({ review_requested_at: new Date().toISOString() })
    .eq('id', jobId)
    .is('review_requested_at', null)
    .select('id')
  if (!claimed || claimed.length === 0) return 'already_requested'

  const template = await reviewTemplate(admin, ctx.job.tenant_id)
  const rendered = renderForJob(ctx, template)

  await sendAndLog({
    ctx,
    rendered,
    channels,
    templateKey: 'review_request',
    templateName: template.name,
    source: 'review_request_auto',
    sentBy: completedBy,
    admin,
  })
  return 'sent'
}
