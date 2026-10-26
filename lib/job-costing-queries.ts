/**
 * Reads that feed lib/job-costing.ts.
 *
 * Split from the maths on purpose: job-costing.ts is pure and testable, this
 * file is the only part that touches Supabase. Same split as
 * lib/rate-calculator.ts and its pages.
 *
 * Every query here is tenant-scoped in the WHERE clause as well as by RLS.
 * RLS is the thing that actually enforces it — the explicit filter is so a
 * mistake shows up as missing rows in development rather than as a policy
 * doing silent work nobody reads.
 *
 * WHAT THIS IS NOT
 *   The existing JobFinancials in lib/job-billing.ts already gives the QUOTED
 *   margin from job_billing_items. This adds the ACTUAL side and the
 *   comparison. Neither replaces the other and the billing hub still owns
 *   quotes, variations, invoices and payments.
 */

import { createClient } from '@/utils/supabase/client'
import {
  calculateJobCost,
  rateOn,
  type CostBaseline,
  type CostedTimeEntry,
  type JobCostResult,
  type MaterialCostLine,
  type OtherCostLine,
} from '@/lib/job-costing'

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

/** Hours between two timestamps, or 0 for a shift still running. */
function hoursBetween(startedAt: string, endedAt: string | null): number {
  if (!endedAt) return 0
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  return ms > 0 ? ms / 3_600_000 : 0
}

export interface JobCostBreakdown extends JobCostResult {
  /** Individual other-cost rows, for the detail list. */
  otherCostLines: { id: string; kind: string; description: string; supplierName: string | null; amountExGst: number; incurredOn: string }[]
  /** True when the signed-in user is not office and saw nothing. */
  restricted: boolean
}

/**
 * Assemble a job's full cost picture.
 *
 * Returns null when the caller cannot see cost data. RLS already denies the
 * rows; this turns an empty result into an explicit "restricted" rather than
 * a job that appears to have cost nothing.
 */
export async function getJobCostBreakdown(
  tenantId: string,
  jobId: string,
  opts: { isOffice: boolean }
): Promise<JobCostBreakdown | null> {
  if (!opts.isOffice) return null

  const supabase = createClient()

  const [baselinesRes, timeRes, otherRes, tenantRes, billingRes, invoicesRes] = await Promise.all([
    supabase
      .from('job_cost_baselines')
      .select('reason, quoted_revenue_ex_gst, quoted_labour_cost, quoted_material_cost, quoted_other_cost, quoted_hours')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId),
    supabase
      .from('time_entries')
      .select('started_at, ended_at, kind, submitted, cost_rate_snapshot, user_id')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .eq('submitted', true),
    supabase
      .from('job_cost_entries')
      .select('id, kind, description, supplier_name, amount_ex_gst, incurred_on')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId)
      .order('incurred_on', { ascending: false }),
    supabase.from('tenants').select('target_margin_percent').eq('id', tenantId).single(),
    supabase
      .from('job_billing_items')
      .select('kind, quantity, unit_cost, cost, revenue')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId),
    supabase
      .from('job_invoices')
      .select('subtotal_ex_gst, status, kind')
      .eq('tenant_id', tenantId)
      .eq('job_id', jobId),
  ])

  const baselines: CostBaseline[] = (baselinesRes.data ?? []).map((b) => ({
    reason: b.reason as CostBaseline['reason'],
    quotedRevenueExGst: num(b.quoted_revenue_ex_gst),
    quotedLabourCost: num(b.quoted_labour_cost),
    quotedMaterialCost: num(b.quoted_material_cost),
    quotedOtherCost: num(b.quoted_other_cost),
    quotedHours: num(b.quoted_hours),
  }))

  // Lunch is unpaid and not a job cost. Travel and overtime are both real
  // money and stay in.
  const time: CostedTimeEntry[] = (timeRes.data ?? [])
    .filter((t) => t.kind !== 'lunch')
    .map((t) => ({
      hours: hoursBetween(t.started_at as string, t.ended_at as string | null),
      // Null here is the whole point: it means "no rate was in force", which
      // job-costing.ts reports as uncosted rather than costing it at zero.
      costRate: t.cost_rate_snapshot == null ? null : num(t.cost_rate_snapshot),
    }))
    .filter((t) => t.hours > 0)

  // Materials come from the billing lines, which already carry a cost column.
  // The PO actual_unit_cost reconciliation is a later step; until it exists
  // these report as unreconciled, which is honest rather than silently
  // claiming the quoted price was what was paid.
  const materials: MaterialCostLine[] = (billingRes.data ?? [])
    .filter((b) => b.kind === 'material')
    .map((b) => {
      const qty = num(b.quantity) || 1
      const unit = b.unit_cost != null ? num(b.unit_cost) : num(b.cost) / qty
      return { quantity: qty, quotedUnitCost: unit, actualUnitCost: null }
    })

  const otherRows = otherRes.data ?? []
  const otherCosts: OtherCostLine[] = otherRows.map((o) => ({
    kind: o.kind as string,
    amountExGst: num(o.amount_ex_gst),
  }))

  // Invoiced revenue excludes drafts and voids. Credit notes are stored as a
  // 'credit' kind and subtract.
  const invoicedRevenueExGst = (invoicesRes.data ?? [])
    .filter((i) => i.status !== 'draft' && i.status !== 'void')
    .reduce((t, i) => t + (i.kind === 'credit' ? -num(i.subtotal_ex_gst) : num(i.subtotal_ex_gst)), 0)

  // Work done but not yet on an invoice: billing-line revenue above what has
  // been invoiced. Never negative — over-invoicing is not negative unbilled.
  const billedLineRevenue = (billingRes.data ?? []).reduce((t, b) => t + num(b.revenue), 0)
  const unbilledRevenueExGst = Math.max(0, billedLineRevenue - invoicedRevenueExGst)

  const targetRaw = (tenantRes.data as { target_margin_percent?: number | string | null } | null)?.target_margin_percent
  const targetMarginPercent = targetRaw == null ? null : num(targetRaw)

  const result = calculateJobCost({
    baselines,
    time,
    materials,
    otherCosts,
    invoicedRevenueExGst,
    unbilledRevenueExGst,
    targetMarginPercent,
  })

  return {
    ...result,
    otherCostLines: otherRows.map((o) => ({
      id: o.id as string,
      kind: o.kind as string,
      description: o.description as string,
      supplierName: (o.supplier_name as string | null) ?? null,
      amountExGst: num(o.amount_ex_gst),
      incurredOn: o.incurred_on as string,
    })),
    restricted: false,
  }
}

/** Add a subcontractor invoice, plant hire, permit or other direct cost. */
export async function addJobCost(input: {
  tenantId: string
  jobId: string
  kind: string
  description: string
  supplierName?: string | null
  reference?: string | null
  amountExGst: number
  incurredOn?: string
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_cost_entries').insert({
    tenant_id: input.tenantId,
    job_id: input.jobId,
    kind: input.kind,
    description: input.description,
    supplier_name: input.supplierName ?? null,
    reference: input.reference ?? null,
    amount_ex_gst: input.amountExGst,
    incurred_on: input.incurredOn ?? new Date().toISOString().slice(0, 10),
  })
  if (error) throw new Error(error.message)
}

export async function deleteJobCost(tenantId: string, id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_cost_entries').delete().eq('tenant_id', tenantId).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Cost rates for a tenant's people, newest first. Office only by RLS.
 * `rateOn` picks the one in force on a given date.
 */
export async function getCostRates(
  tenantId: string
): Promise<Record<string, { costRate: number; effectiveFrom: string }[]>> {
  const supabase = createClient()
  const { data } = await supabase
    .from('tenant_member_cost_rates')
    .select('user_id, cost_rate, effective_from')
    .eq('tenant_id', tenantId)
    .order('effective_from', { ascending: false })

  const out: Record<string, { costRate: number; effectiveFrom: string }[]> = {}
  for (const r of data ?? []) {
    const uid = r.user_id as string
    ;(out[uid] ??= []).push({ costRate: num(r.cost_rate), effectiveFrom: r.effective_from as string })
  }
  return out
}

export async function setCostRate(input: {
  tenantId: string
  userId: string
  costRate: number
  effectiveFrom?: string
  note?: string | null
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('tenant_member_cost_rates').upsert(
    {
      tenant_id: input.tenantId,
      user_id: input.userId,
      cost_rate: input.costRate,
      effective_from: input.effectiveFrom ?? new Date().toISOString().slice(0, 10),
      note: input.note ?? null,
    },
    { onConflict: 'tenant_id,user_id,effective_from' }
  )
  if (error) throw new Error(error.message)
}

export { rateOn }
