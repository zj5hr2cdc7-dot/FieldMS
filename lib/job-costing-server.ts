/**
 * Writes job_cost_baselines. SERVER ONLY.
 *
 * WHY THIS FILE EXISTS
 *   job_cost_baselines has a SELECT policy and deliberately no INSERT policy,
 *   so the browser cannot write it at all. That is the point: a baseline is
 *   the frozen record of what a job was quoted at, and an approved price must
 *   not be editable from a client. Every row therefore comes through here,
 *   with the service-role client, triggered by an approval the server has
 *   already validated.
 *
 * WITHOUT THIS, THE FEATURE DOES NOT WORK
 *   Migration 035 created the table and lib/job-costing.ts reads it, but
 *   nothing wrote to it. Every job would have reported "No quoted baseline
 *   was captured for this job" forever. This closes that.
 *
 * THREE APPROVAL PATHS, ONE WRITER
 *   - customer approves a quote      /api/quotes/[token]
 *   - customer approves a variation  /api/variations/[token]
 *   - office approves a variation    /api/jobs/[jobId]/variations/[id]/approve
 *   All three land here so they cannot drift.
 */

import { createAdminClient } from '@/utils/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Capture the quoted position for a job at the moment its quote is accepted.
 *
 * Revenue comes from the estimate total, which is the number the customer
 * actually agreed to. Cost and hours come from the job's billing lines, which
 * is the only place a cost breakdown exists — and the reason this is captured
 * now rather than read later, because those lines keep being edited.
 */
export async function captureQuoteBaseline(
  admin: Admin,
  input: { tenantId: string; jobId: string; estimateId: string; revenueExGst: number }
): Promise<void> {
  // One baseline per estimate. The approval routes already reject a repeat
  // response, but a retry or a double-submit must not double-count the quote.
  const { data: existing } = await admin
    .from('job_cost_baselines')
    .select('id')
    .eq('estimate_id', input.estimateId)
    .limit(1)
  if (existing && existing.length > 0) return

  const { data: lines } = await admin
    .from('job_billing_items')
    .select('kind, hours, cost')
    .eq('tenant_id', input.tenantId)
    .eq('job_id', input.jobId)

  let labour = 0
  let material = 0
  let hours = 0
  for (const l of lines ?? []) {
    const cost = num(l.cost)
    if (l.kind === 'material') material += cost
    else {
      labour += cost
      hours += num(l.hours)
    }
  }

  await admin.from('job_cost_baselines').insert({
    tenant_id: input.tenantId,
    job_id: input.jobId,
    reason: 'quote_accepted',
    estimate_id: input.estimateId,
    quoted_revenue_ex_gst: round2(input.revenueExGst),
    quoted_labour_cost: round2(labour),
    quoted_material_cost: round2(material),
    quoted_other_cost: 0,
    quoted_hours: round2(hours),
  })
}

/**
 * Capture the extra quoted position an approved variation adds.
 *
 * Baselines are summed, not replaced, so this records only what the variation
 * itself adds. A variation carries its own labour and material cost and its
 * own sell value, so nothing has to be inferred.
 *
 * Hours are left at zero: job_variations stores labour as a dollar figure
 * with no hours against it. Recording a guess here would quietly corrupt the
 * hours variance on the job, which is one of the figures the whole feature
 * exists to get right.
 */
export async function captureVariationBaseline(
  admin: Admin,
  variation: {
    id: string
    tenant_id: string
    job_id: string
    total_ex_gst: number | string
    labour_cost: number | string
    material_cost: number | string
  }
): Promise<void> {
  const { data: existing } = await admin
    .from('job_cost_baselines')
    .select('id')
    .eq('variation_id', variation.id)
    .limit(1)
  if (existing && existing.length > 0) return

  await admin.from('job_cost_baselines').insert({
    tenant_id: variation.tenant_id,
    job_id: variation.job_id,
    reason: 'variation_approved',
    variation_id: variation.id,
    quoted_revenue_ex_gst: round2(num(variation.total_ex_gst)),
    quoted_labour_cost: round2(num(variation.labour_cost)),
    quoted_material_cost: round2(num(variation.material_cost)),
    quoted_other_cost: 0,
    quoted_hours: 0,
  })
}

/**
 * Run a baseline capture without letting it break the approval it follows.
 *
 * An approval is the customer's decision and must succeed even if the costing
 * write fails. Same reasoning as the review request in
 * /api/jobs/[jobId]/events: a reporting side effect never undoes a commercial
 * action. A missing baseline degrades visibly in the UI ("No quoted baseline
 * was captured") rather than silently, so this is recoverable.
 */
export async function captureBaselineSafely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn()
  } catch (err) {
    console.error(`Cost baseline capture failed (${label}):`, err)
  }
}
