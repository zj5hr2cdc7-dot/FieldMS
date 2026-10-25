/**
 * Customer message templates — the built-in set, and the merge-field renderer.
 *
 * Pure module: no Supabase, no React. Imported by the template library page,
 * the "Message customer" dialog and the server send route, so a preview and
 * the message that actually goes out are rendered by the same code.
 *
 * BUILT-INS LIVE HERE, NOT IN THE DATABASE
 *   A business only gets a row in message_templates when it edits a built-in
 *   (same template_key) or writes its own. Untouched built-ins therefore pick
 *   up wording improvements with every release instead of being frozen at
 *   whatever was seeded the day they signed up.
 *
 * BRANDING
 *   Every template signs off as the business. Nothing customer-facing says
 *   FieldMS — "sent from <software>" footers are a long-running complaint
 *   about competitors.
 */

export type TemplateCategory = 'quotes' | 'scheduling' | 'payments' | 'reviews' | 'follow_up' | 'custom'

export const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  quotes: 'Quotes',
  scheduling: 'Scheduling',
  payments: 'Payments',
  reviews: 'Reviews',
  follow_up: 'Follow-up',
  custom: 'Your templates',
}

export interface TemplateContent {
  name: string
  category: TemplateCategory
  subject: string
  sms_body: string
  email_body: string
}

export interface BuiltInTemplate extends TemplateContent {
  key: string
}

/** A template as the app uses it: a built-in, an edited built-in, or custom. */
export interface ResolvedTemplate extends TemplateContent {
  /** message_templates.id, when the business has a row for it. */
  id: string | null
  /** Built-in key, null for custom templates. */
  key: string | null
  source: 'built_in' | 'edited' | 'custom'
}

// ── Merge fields ──────────────────────────────────────────────────────────

export const MERGE_FIELDS = [
  { token: 'customer_first_name', label: 'Customer first name', example: 'Sarah' },
  { token: 'customer_name', label: 'Customer full name', example: 'Sarah Nguyen' },
  { token: 'business_name', label: 'Your business name', example: 'Bright Spark Electrical' },
  { token: 'business_phone', label: 'Your phone', example: '0400 123 456' },
  { token: 'sender_name', label: 'Your name (whoever sends it)', example: 'Jack' },
  { token: 'job_title', label: 'Job title', example: 'Switchboard upgrade' },
  { token: 'job_address', label: 'Job address', example: '12 Smith St, Toowoomba' },
  { token: 'scheduled_date', label: 'Scheduled date', example: 'Tue 14 Oct' },
  { token: 'quote_link', label: 'Link to the quote', example: 'https://…/quote/…' },
  { token: 'invoice_link', label: 'Link to the latest invoice', example: 'https://…/invoice/…' },
  { token: 'invoice_number', label: 'Invoice number', example: 'INV-0042' },
  { token: 'amount_due', label: 'Amount owing (inc GST)', example: '$1,240.00' },
  { token: 'review_link', label: 'Your Google review link', example: 'https://g.page/r/…/review' },
] as const

export type MergeField = (typeof MERGE_FIELDS)[number]['token']
export type MergeValues = Partial<Record<MergeField, string | null>>

const TOKEN_RE = /\{([a-z_]+)\}/g

/** Merge fields a piece of text uses. */
export function fieldsUsed(...texts: string[]): MergeField[] {
  const known = new Set<string>(MERGE_FIELDS.map((f) => f.token))
  const found = new Set<MergeField>()
  for (const t of texts) {
    for (const m of t.matchAll(TOKEN_RE)) if (known.has(m[1])) found.add(m[1] as MergeField)
  }
  return [...found]
}

/**
 * Fields the template uses that have no value for this job. The send route
 * refuses to send rather than text a customer "pay here: " with no link.
 */
export function missingFields(values: MergeValues, ...texts: string[]): MergeField[] {
  return fieldsUsed(...texts).filter((f) => !values[f] || !String(values[f]).trim())
}

/** Replace {tokens}. Unknown tokens are left as typed so typos are visible. */
export function renderTemplate(text: string, values: MergeValues): string {
  return text.replace(TOKEN_RE, (whole, token: string) => {
    const v = values[token as MergeField]
    return v === undefined || v === null ? whole : String(v)
  })
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Plain-text email body to safe HTML: escaped, paragraphs kept, bare links
 * made clickable. Templates are written as plain text on purpose — tradies
 * should not have to think about HTML.
 */
export function textToEmailHtml(text: string): string {
  const linkify = (s: string) =>
    s.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}">${url}</a>`)
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${linkify(escapeHtml(para)).replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}

/** Rough SMS segment count (GSM-7, 160 / 153 per part). */
export function smsSegments(text: string): number {
  if (!text) return 0
  return text.length <= 160 ? 1 : Math.ceil(text.length / 153)
}

// ── Built-in templates ─────────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    key: 'quote_follow_up',
    name: 'Quote follow-up',
    category: 'quotes',
    subject: 'Following up on your quote — {business_name}',
    sms_body:
      'Hi {customer_first_name}, {sender_name} from {business_name} here. Just checking you got our quote for {job_title}. Happy to answer any questions: {quote_link}',
    email_body:
      'Hi {customer_first_name},\n\nJust following up on the quote we sent for {job_title}. You can view and accept it here:\n{quote_link}\n\nIf anything needs changing, or you have questions, reply to this email or call me on {business_phone}.\n\nThanks,\n{sender_name}\n{business_name}',
  },
  {
    key: 'quote_final_nudge',
    name: 'Quote last check-in',
    category: 'quotes',
    subject: 'Still keen on {job_title}?',
    sms_body:
      'Hi {customer_first_name}, {business_name} here. Last check-in on the {job_title} quote. If the timing or price isn\'t right, let us know and we\'ll see what we can do. {quote_link}',
    email_body:
      'Hi {customer_first_name},\n\nI wanted to check in one last time about {job_title}. If the timing or the price isn\'t quite right, let me know and we\'ll see what we can do.\n\n{quote_link}\n\nCheers,\n{sender_name}\n{business_name}',
  },
  {
    key: 'booking_confirmation',
    name: 'Booking confirmation',
    category: 'scheduling',
    subject: 'You\'re booked in — {business_name}',
    sms_body:
      'Hi {customer_first_name}, you\'re booked in with {business_name} on {scheduled_date} for {job_title}. Reply to this message if you need to change it.',
    email_body:
      'Hi {customer_first_name},\n\nThanks for booking with us. We\'ll see you on {scheduled_date} at {job_address} for {job_title}.\n\nIf you need to change the time, just reply or call {business_phone}.\n\nThanks,\n{business_name}',
  },
  {
    key: 'appointment_reminder',
    name: 'Appointment reminder',
    category: 'scheduling',
    subject: 'Reminder: we\'re coming on {scheduled_date}',
    sms_body:
      'Hi {customer_first_name}, reminder from {business_name}: we\'re booked for {job_title} on {scheduled_date}. Please make sure we can get access. See you then!',
    email_body:
      'Hi {customer_first_name},\n\nA quick reminder that we\'re booked for {job_title} on {scheduled_date} at {job_address}.\n\nPlease make sure we can get access to the work area and that any pets are secured.\n\nSee you then,\n{business_name}',
  },
  {
    key: 'running_late',
    name: 'Running late',
    category: 'scheduling',
    subject: 'Running a little late — {business_name}',
    sms_body:
      'Hi {customer_first_name}, {sender_name} from {business_name}. Sorry, the job before yours ran over and I\'m running a bit late. I\'ll be there as soon as I can.',
    email_body:
      'Hi {customer_first_name},\n\nSorry, the job before yours ran over and I\'m running a bit late. I\'ll be there as soon as I can.\n\n{sender_name}\n{business_name}',
  },
  {
    key: 'invoice_sent',
    name: 'Invoice sent',
    category: 'payments',
    subject: 'Invoice {invoice_number} from {business_name}',
    sms_body:
      'Hi {customer_first_name}, thanks for choosing {business_name}. Your invoice for {job_title} ({amount_due}) is here: {invoice_link}',
    email_body:
      'Hi {customer_first_name},\n\nThanks for choosing {business_name}. Your invoice {invoice_number} for {job_title} is ready. Amount due: {amount_due}.\n\nView and pay here:\n{invoice_link}\n\nThanks,\n{business_name}',
  },
  {
    key: 'payment_reminder',
    name: 'Friendly payment reminder',
    category: 'payments',
    subject: 'Friendly reminder: invoice {invoice_number}',
    sms_body:
      'Hi {customer_first_name}, friendly reminder from {business_name} that {amount_due} is still owing on invoice {invoice_number}. You can pay here: {invoice_link}. Ignore this if you\'ve already paid!',
    email_body:
      'Hi {customer_first_name},\n\nJust a friendly reminder that {amount_due} is still owing on invoice {invoice_number} for {job_title}.\n\nYou can view and pay it here:\n{invoice_link}\n\nIf you\'ve already paid, thank you, and please ignore this message.\n\nThanks,\n{business_name}',
  },
  {
    key: 'payment_overdue',
    name: 'Overdue payment',
    category: 'payments',
    subject: 'Overdue: invoice {invoice_number}',
    sms_body:
      'Hi {customer_first_name}, invoice {invoice_number} from {business_name} ({amount_due}) is now overdue. Please pay here: {invoice_link} or call {business_phone} to discuss.',
    email_body:
      'Hi {customer_first_name},\n\nInvoice {invoice_number} for {job_title} is now overdue, with {amount_due} outstanding.\n\nPlease pay here: {invoice_link}\n\nIf there\'s a problem with the invoice or you\'d like to arrange a payment plan, call me on {business_phone}.\n\nRegards,\n{sender_name}\n{business_name}',
  },
  {
    key: 'payment_thanks',
    name: 'Payment received',
    category: 'payments',
    subject: 'Payment received — thank you',
    sms_body: 'Hi {customer_first_name}, payment received for {job_title}. Thanks for choosing {business_name}!',
    email_body:
      'Hi {customer_first_name},\n\nWe\'ve received your payment for {job_title}. Thanks for choosing {business_name}, we appreciate the work.\n\nCheers,\n{business_name}',
  },
  {
    key: 'review_request',
    name: 'Google review request',
    category: 'reviews',
    subject: 'How did we go? — {business_name}',
    sms_body:
      'Hi {customer_first_name}, thanks for choosing {business_name}. If you were happy with the job, a quick Google review would really help our small business: {review_link}',
    email_body:
      'Hi {customer_first_name},\n\nThanks for choosing {business_name} for {job_title}.\n\nIf you were happy with the work, would you mind leaving us a quick Google review? It takes a minute and makes a big difference to a small local business:\n{review_link}\n\nThanks again,\n{sender_name}\n{business_name}',
  },
  {
    key: 'job_check_in',
    name: 'Post-job check-in',
    category: 'follow_up',
    subject: 'Everything working well?',
    sms_body:
      'Hi {customer_first_name}, {sender_name} from {business_name}. Just checking everything is working well after {job_title}. Let me know if anything needs a look.',
    email_body:
      'Hi {customer_first_name},\n\nJust checking in to make sure everything is working well after {job_title}. If anything isn\'t right, reply here and we\'ll sort it.\n\nThanks,\n{sender_name}\n{business_name}',
  },
  {
    key: 'service_due',
    name: 'Service / test due',
    category: 'follow_up',
    subject: 'Time for your next service — {business_name}',
    sms_body:
      'Hi {customer_first_name}, {business_name} here. It\'s about time for your next service / safety check. Reply to book a time that suits.',
    email_body:
      'Hi {customer_first_name},\n\nIt\'s about time for your next service / safety check at {job_address}. Reply to this email or call {business_phone} and we\'ll book a time that suits.\n\nThanks,\n{business_name}',
  },
]

export function builtIn(key: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.key === key)
}

/** Row shape from message_templates, as far as this module cares. */
export interface TemplateRow extends TemplateContent {
  id: string
  template_key: string | null
  active: boolean
}

/**
 * Merge built-ins with a business's rows. An edited built-in replaces the
 * default in place; a deactivated row hides the built-in; custom rows follow.
 */
export function resolveTemplates(rows: TemplateRow[]): ResolvedTemplate[] {
  const byKey = new Map(rows.filter((r) => r.template_key).map((r) => [r.template_key as string, r]))
  const out: ResolvedTemplate[] = []
  for (const b of BUILT_IN_TEMPLATES) {
    const row = byKey.get(b.key)
    if (row && !row.active) continue
    out.push(
      row
        ? { id: row.id, key: b.key, source: 'edited', name: row.name, category: b.category, subject: row.subject, sms_body: row.sms_body, email_body: row.email_body }
        : { id: null, key: b.key, source: 'built_in', name: b.name, category: b.category, subject: b.subject, sms_body: b.sms_body, email_body: b.email_body }
    )
  }
  for (const r of rows) {
    if (r.template_key || !r.active) continue
    out.push({ id: r.id, key: null, source: 'custom', name: r.name, category: r.category, subject: r.subject, sms_body: r.sms_body, email_body: r.email_body })
  }
  return out
}

export function firstName(fullName: string | null | undefined): string {
  const n = (fullName ?? '').trim()
  if (!n) return 'there'
  return n.split(/\s+/)[0]
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })
}
