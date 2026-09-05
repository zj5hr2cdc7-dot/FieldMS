import type { Estimate, EstimateItem } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

export type NewEstimateItem = {
  name: string
  quantity: number
  unit_price: number
  total: number
}

export async function getEstimatesForBusiness(businessId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('estimates')
    .select('id, customer_name, total, status, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (
    (data || []).map((estimate: Record<string, unknown>) => ({
      ...estimate,
      total: Number(estimate.total),
    })) as Estimate[]
  )
}

export async function getEstimateWithItems(
  estimateId: string,
  businessId: string
): Promise<Estimate & { items: EstimateItem[] }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('estimates')
    .select('id, business_id, job_id, customer_name, total, status, public_token, customer_email, customer_phone, deposit_percent, approved_at, declined_at, approval_name, approval_note, sent_at, created_at, updated_at, estimate_items(id, name, quantity, unit_price, total)')
    .eq('id', estimateId)
    .eq('business_id', businessId)
    .single()

  if (error) throw error
  if (!data) throw new Error('Estimate not found')

  return {
    ...data,
    total: Number(data.total),
    deposit_percent: Number((data as Record<string, unknown>).deposit_percent) || 0,
    items: (data.estimate_items || []).map((item: Record<string, unknown>) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total: Number(item.total),
    })),
  } as unknown as Estimate & { items: EstimateItem[] }
}

export async function updateEstimateStatus(
  estimateId: string,
  businessId: string,
  status: string
): Promise<Estimate> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('estimates')
    .update({ status })
    .eq('id', estimateId)
    .eq('business_id', businessId)
    .select()
    .single()

  if (error) throw error
  return {
    ...data,
    total: Number(data.total),
  } as Estimate
}

export async function updateEstimateDeposit(
  estimateId: string,
  businessId: string,
  depositPercent: number
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('estimates')
    .update({ deposit_percent: depositPercent })
    .eq('id', estimateId)
    .eq('business_id', businessId)
  if (error) throw error
}

export async function markEstimateSent(estimateId: string, businessId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('estimates')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', estimateId)
    .eq('business_id', businessId)
  if (error) throw error
}

export function quoteShareUrl(estimate: Pick<Estimate, 'public_token'>): string | null {
  if (!estimate.public_token) return null
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/quote/${estimate.public_token}`
}

/**
 * Creates a job from an accepted (or draft) estimate and links the two so the
 * quote's value seeds the job's billing dashboard. Returns the new job id.
 */
export async function convertEstimateToJob(
  estimate: Estimate,
  tenantId: string,
  userId: string
): Promise<string> {
  const { createJob } = await import('@/lib/jobs')
  const supabase = createClient()

  // Quote total is inc-GST; seed the job's quoted value ex GST (10% GST assumed).
  const quoteExGst = Math.round((estimate.total / 1.1) * 100) / 100

  const job = await createJob(tenantId, userId, {
    title: `${estimate.customer_name} — quoted work`,
    customer_name: estimate.customer_name,
    customer_email: estimate.customer_email ?? undefined,
    customer_phone: estimate.customer_phone ?? undefined,
  })

  await supabase.from('jobs').update({ quote_total: quoteExGst }).eq('id', job.id)
  await supabase.from('estimates').update({ job_id: job.id }).eq('id', estimate.id).eq('business_id', tenantId)

  return job.id
}

export async function linkEstimateToJob(estimateId: string, tenantId: string, jobId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('estimates')
    .update({ job_id: jobId })
    .eq('id', estimateId)
    .eq('business_id', tenantId)
  if (error) throw error
}

export async function createEstimate(
  businessId: string,
  customerName: string,
  total: number,
  items: NewEstimateItem[]
): Promise<Estimate> {
  const supabase = createClient()

  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert({
      business_id: businessId,
      customer_name: customerName,
      status: 'draft',
      total,
    })
    .select()
    .single()

  if (error) throw error
  if (!estimate) throw new Error('Failed to create estimate')

  const itemsToInsert = items.map((item) => ({
    estimate_id: estimate.id,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
  }))

  const { error: itemsError } = await supabase.from('estimate_items').insert(itemsToInsert)
  if (itemsError) throw itemsError

  return estimate as Estimate
}
