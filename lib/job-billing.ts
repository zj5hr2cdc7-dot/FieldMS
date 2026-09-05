/**
 * Job Billing hub — the financial engine that lives inside every job.
 * Rollup, variations, invoices, payments-in-context and the append-only
 * financial audit trail. Reuses job_billing_items (labour+material) and
 * job_payments (deposits/progress/final).
 */

import { createClient } from '@/utils/supabase/client'
import { getBillingItemsForJob } from '@/lib/billing'
import { getPaymentsForJob } from '@/lib/payments'
import type {
  BillingAuditEvent,
  InvoiceKind,
  JobFinancials,
  JobInvoice,
  JobInvoiceItem,
  JobVariation,
  VariationStatus,
} from '@/types/billing'
import type { Job, JobPayment } from '@/types/database'

const round2 = (n: number) => Math.round(n * 100) / 100

// ── Audit (append-only) ─────────────────────────────────────────────────────

export async function logBilling(
  tenantId: string,
  jobId: string,
  eventType: string,
  opts: { actorName?: string | null; amount?: number | null; reason?: string | null; previous?: unknown; next?: unknown; meta?: Record<string, unknown> } = {}
): Promise<void> {
  const supabase = createClient()
  await supabase.from('billing_audit_events').insert({
    tenant_id: tenantId,
    job_id: jobId,
    event_type: eventType,
    actor_name: opts.actorName ?? null,
    amount: opts.amount ?? null,
    reason: opts.reason ?? null,
    previous_value: opts.previous ?? null,
    new_value: opts.next ?? null,
    meta: opts.meta ?? {},
  })
}

export async function getBillingTimeline(jobId: string): Promise<BillingAuditEvent[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('billing_audit_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data || []) as BillingAuditEvent[]
}

// ── Variations ──────────────────────────────────────────────────────────────

export async function getVariations(jobId: string): Promise<JobVariation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_variations')
    .select('*')
    .eq('job_id', jobId)
    .order('variation_number')
  if (error) throw error
  return (data || []).map(numifyVariation)
}

function numifyVariation(v: Record<string, unknown>): JobVariation {
  return {
    ...(v as unknown as JobVariation),
    material_cost: Number(v.material_cost),
    labour_cost: Number(v.labour_cost),
    markup_percent: Number(v.markup_percent),
    total_ex_gst: Number(v.total_ex_gst),
  }
}

export async function createVariation(input: {
  tenantId: string
  jobId: string
  userId: string
  actorName?: string | null
  description: string
  reason?: string
  materialCost: number
  labourCost: number
  markupPercent: number
}): Promise<JobVariation> {
  const supabase = createClient()
  const existing = await getVariations(input.jobId)
  const nextNumber = (existing.at(-1)?.variation_number ?? 0) + 1
  const total = round2((input.materialCost + input.labourCost) * (1 + input.markupPercent / 100))

  const { data, error } = await supabase
    .from('job_variations')
    .insert({
      tenant_id: input.tenantId,
      job_id: input.jobId,
      variation_number: nextNumber,
      description: input.description,
      reason: input.reason ?? null,
      material_cost: input.materialCost,
      labour_cost: input.labourCost,
      markup_percent: input.markupPercent,
      total_ex_gst: total,
      status: 'pending',
      created_by: input.userId,
    })
    .select()
    .single()
  if (error) throw error
  await logBilling(input.tenantId, input.jobId, 'variation_added', {
    actorName: input.actorName, amount: total, meta: { variation_number: nextNumber, description: input.description },
  })
  return numifyVariation(data)
}

export async function updateVariationStatus(
  variation: JobVariation,
  status: VariationStatus,
  actorName?: string | null
): Promise<JobVariation> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'approved') {
    patch.approved_at = new Date().toISOString()
    patch.approved_by_name = actorName ?? null
  }
  const { data, error } = await supabase.from('job_variations').update(patch).eq('id', variation.id).select().single()
  if (error) throw error
  await logBilling(variation.tenant_id, variation.job_id, `variation_${status}`, {
    actorName, amount: variation.total_ex_gst, previous: { status: variation.status }, next: { status },
    meta: { variation_number: variation.variation_number },
  })
  return numifyVariation(data)
}

export function variationShareUrl(v: Pick<JobVariation, 'public_token'>): string | null {
  if (!v.public_token) return null
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/variation/${v.public_token}`
}

// ── Invoices ────────────────────────────────────────────────────────────────

export async function getInvoices(jobId: string): Promise<JobInvoice[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_invoices')
    .select('*, job_invoice_items(*)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((inv: Record<string, unknown>) => ({
    ...(inv as unknown as JobInvoice),
    subtotal_ex_gst: Number(inv.subtotal_ex_gst),
    gst_amount: Number(inv.gst_amount),
    total_inc_gst: Number(inv.total_inc_gst),
    discount: Number(inv.discount),
    amount_paid: Number(inv.amount_paid),
    items: ((inv.job_invoice_items as Record<string, unknown>[]) || [])
      .map((i) => ({ ...(i as unknown as JobInvoiceItem), quantity: Number(i.quantity), unit_price: Number(i.unit_price), amount: Number(i.amount) }))
      .sort((a, b) => a.sort - b.sort),
  }))
}

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const supabase = createClient()
  const { data } = await supabase.rpc('next_document_number', { p_tenant_id: tenantId, p_prefix: 'INV' })
  const seq = Number(data) || 1
  return `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`
}

export interface NewInvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

export async function createInvoice(input: {
  tenantId: string
  jobId: string
  userId: string
  actorName?: string | null
  kind: InvoiceKind
  items: NewInvoiceItem[]
  discount?: number
  gstRate: number
  dueDate?: string | null
  progressPercent?: number | null
  notes?: string | null
}): Promise<JobInvoice> {
  const supabase = createClient()
  const subtotal = round2(input.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0) - (input.discount ?? 0))
  const gst = round2(subtotal * (input.gstRate / 100))
  const total = round2(subtotal + gst)
  const invoiceNumber = await nextInvoiceNumber(input.tenantId)

  const { data: invoice, error } = await supabase
    .from('job_invoices')
    .insert({
      tenant_id: input.tenantId,
      job_id: input.jobId,
      invoice_number: invoiceNumber,
      kind: input.kind,
      status: 'draft',
      subtotal_ex_gst: subtotal,
      gst_amount: gst,
      total_inc_gst: total,
      discount: input.discount ?? 0,
      progress_percent: input.progressPercent ?? null,
      notes: input.notes ?? null,
      due_date: input.dueDate ?? null,
      issued_at: new Date().toISOString(),
      created_by: input.userId,
    })
    .select()
    .single()
  if (error) throw error

  if (input.items.length) {
    const rows = input.items.map((i, idx) => ({
      invoice_id: invoice.id,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unitPrice,
      amount: round2(i.quantity * i.unitPrice),
      sort: idx,
    }))
    const { error: itemErr } = await supabase.from('job_invoice_items').insert(rows)
    if (itemErr) throw itemErr
  }

  await logBilling(input.tenantId, input.jobId, 'invoice_created', {
    actorName: input.actorName, amount: total, meta: { invoice_number: invoiceNumber, kind: input.kind },
  })
  return { ...(invoice as JobInvoice), subtotal_ex_gst: subtotal, gst_amount: gst, total_inc_gst: total, amount_paid: 0, discount: input.discount ?? 0 }
}

export async function updateInvoiceStatus(invoice: JobInvoice, status: JobInvoice['status'], actorName?: string | null): Promise<void> {
  const supabase = createClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'sent') patch.sent_at = new Date().toISOString()
  const { error } = await supabase.from('job_invoices').update(patch).eq('id', invoice.id)
  if (error) throw error
  await logBilling(invoice.tenant_id, invoice.job_id, `invoice_${status}`, {
    actorName, amount: invoice.total_inc_gst, meta: { invoice_number: invoice.invoice_number },
  })
}

export function invoiceShareUrl(inv: Pick<JobInvoice, 'public_token'>): string | null {
  if (!inv.public_token) return null
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/invoice/${inv.public_token}`
}

/** Applies a payment to an invoice and recomputes its paid/status. */
export async function applyInvoicePayment(invoice: JobInvoice, amount: number): Promise<void> {
  const supabase = createClient()
  const paid = round2(invoice.amount_paid + amount)
  const status = paid >= invoice.total_inc_gst - 0.005 ? 'paid' : paid > 0 ? 'part_paid' : invoice.status
  const { error } = await supabase.from('job_invoices').update({ amount_paid: paid, status }).eq('id', invoice.id)
  if (error) throw error
}

// ── Financial rollup ────────────────────────────────────────────────────────

export function computeFinancials(
  job: Pick<Job, 'gst_rate' | 'quote_total'>,
  billingItems: Awaited<ReturnType<typeof getBillingItemsForJob>>,
  variations: JobVariation[],
  invoices: JobInvoice[],
  payments: JobPayment[]
): JobFinancials {
  const gstRate = Number(job.gst_rate ?? 10)

  // Base quoted value: explicit quote_total if set, else sum of billing item revenue
  const billingRevenue = billingItems.reduce((s, i) => s + Number(i.revenue), 0)
  const quotedValueExGst = Number(job.quote_total) > 0 ? Number(job.quote_total) : round2(billingRevenue)

  const approvedVariationsExGst = round2(
    variations.filter((v) => ['approved', 'completed'].includes(v.status)).reduce((s, v) => s + v.total_ex_gst, 0)
  )
  const pendingVariationsExGst = round2(
    variations.filter((v) => ['draft', 'pending'].includes(v.status)).reduce((s, v) => s + v.total_ex_gst, 0)
  )

  const jobValueExGst = round2(quotedValueExGst + approvedVariationsExGst)
  const gstAmount = round2(jobValueExGst * (gstRate / 100))
  const jobValueIncGst = round2(jobValueExGst + gstAmount)

  const materialCost = round2(billingItems.filter((i) => i.kind === 'material').reduce((s, i) => s + Number(i.cost), 0)
    + variations.filter((v) => ['approved', 'completed'].includes(v.status)).reduce((s, v) => s + v.material_cost, 0))
  const labourCost = round2(billingItems.filter((i) => i.kind !== 'material').reduce((s, i) => s + Number(i.cost), 0)
    + variations.filter((v) => ['approved', 'completed'].includes(v.status)).reduce((s, v) => s + v.labour_cost, 0))
  const totalCost = round2(materialCost + labourCost)
  const grossMargin = round2(jobValueExGst - totalCost)
  const grossMarginPct = jobValueExGst > 0 ? round2((grossMargin / jobValueExGst) * 100) : null

  const depositReceived = round2(payments.filter((p) => p.kind === 'deposit').reduce((s, p) => s + p.amount, 0))
  const progressReceived = round2(payments.filter((p) => p.kind === 'payment').reduce((s, p) => s + p.amount, 0))
  const refunds = round2(payments.filter((p) => p.kind === 'refund').reduce((s, p) => s + p.amount, 0))
  const totalPaid = round2(depositReceived + progressReceived - refunds)

  const outstandingBalance = round2(Math.max(0, jobValueIncGst - totalPaid))
  const customerCreditBalance = round2(Math.max(0, totalPaid - jobValueIncGst))

  const sentInvoices = invoices.filter((i) => i.status !== 'draft' && i.status !== 'void')
  const invoicedTotalIncGst = round2(sentInvoices.reduce((s, i) => s + i.total_inc_gst, 0))
  const lastInvoiceDate = sentInvoices.length
    ? sentInvoices.map((i) => i.issued_at ?? i.created_at).sort().at(-1) ?? null
    : null
  const dueDates = invoices.filter((i) => i.due_date && i.status !== 'paid' && i.status !== 'void').map((i) => i.due_date!) as string[]
  const nextDueDate = dueDates.sort()[0] ?? null
  const overdue = Boolean(nextDueDate && new Date(nextDueDate) < new Date() && outstandingBalance > 0)

  return {
    gstRate,
    quotedValueExGst,
    approvedVariationsExGst,
    pendingVariationsExGst,
    jobValueExGst,
    jobValueIncGst,
    gstAmount,
    materialCost,
    labourCost,
    totalCost,
    grossMargin,
    grossMarginPct,
    depositReceived,
    progressReceived,
    totalPaid,
    outstandingBalance,
    customerCreditBalance,
    invoiceCount: invoices.length,
    invoicedTotalIncGst,
    lastInvoiceDate,
    nextDueDate,
    overdue,
  }
}

/** Convenience: load everything a job's billing dashboard needs in one call. */
export async function loadJobBilling(jobId: string, job: Pick<Job, 'gst_rate' | 'quote_total'>) {
  const [billingItems, variations, invoices, payments] = await Promise.all([
    getBillingItemsForJob(jobId),
    getVariations(jobId),
    getInvoices(jobId),
    getPaymentsForJob(jobId),
  ])
  const financials = computeFinancials(job, billingItems, variations, invoices, payments)
  return { billingItems, variations, invoices, payments, financials }
}

export async function updateJobBillingSettings(
  jobId: string,
  updates: Partial<{ quote_total: number; gst_rate: number; po_number: string; billing_notes: string }>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('jobs').update(updates).eq('id', jobId)
  if (error) throw error
}
