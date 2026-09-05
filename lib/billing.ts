import { createClient } from '@/utils/supabase/client'
import type { JobBillingItem } from '@/types/database'

export async function getBillingItemsForJob(jobId: string): Promise<JobBillingItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_billing_items')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface MaterialBillingInput {
  description: string
  quantity: number
  unitCost: number
  masterProductId?: string | null
  priceSource?: string | null
}

export interface SaveBillingItemsInput {
  jobId: string
  tenantId: string
  userId: string
  markupPercent: number
  items: Array<{ description: string; hours: number; ratePerHour: number }>
  materials?: MaterialBillingInput[]
}

export async function saveBillingItems(input: SaveBillingItemsInput): Promise<void> {
  const supabase = createClient()

  // Delete existing items for this job then re-insert (replace strategy)
  const { error: delError } = await supabase
    .from('job_billing_items')
    .delete()
    .eq('job_id', input.jobId)
    .eq('tenant_id', input.tenantId)
  if (delError) throw delError

  const materials = input.materials ?? []
  if (input.items.length === 0 && materials.length === 0) return

  const labourRows = input.items.map((item) => {
    const cost = item.hours * item.ratePerHour
    const revenue = cost * (1 + input.markupPercent / 100)
    return {
      job_id: input.jobId,
      tenant_id: input.tenantId,
      kind: 'labour' as const,
      description: item.description,
      hours: item.hours,
      rate_per_hour: item.ratePerHour,
      markup_percent: input.markupPercent,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      created_by: input.userId,
    }
  })

  const materialRows = materials.map((m) => {
    const cost = m.quantity * m.unitCost
    const revenue = cost * (1 + input.markupPercent / 100)
    return {
      job_id: input.jobId,
      tenant_id: input.tenantId,
      kind: 'material' as const,
      description: m.description,
      hours: 0,
      rate_per_hour: 0,
      quantity: m.quantity,
      unit_cost: m.unitCost,
      master_product_id: m.masterProductId ?? null,
      price_source: m.priceSource ?? null,
      markup_percent: input.markupPercent,
      revenue: Math.round(revenue * 100) / 100,
      cost: Math.round(cost * 100) / 100,
      created_by: input.userId,
    }
  })

  const { error } = await supabase.from('job_billing_items').insert([...labourRows, ...materialRows])
  if (error) throw error
}

export interface QuarterlyPnL {
  quarter: string   // e.g. "Q2 2026"
  year: number
  q: number
  revenue: number
  cost: number
  profit: number
  jobCount: number
  jobs: Array<{ id: string; title: string; revenue: number; cost: number; profit: number; completedAt: string }>
}

export async function getQuarterlyPnL(tenantId: string): Promise<QuarterlyPnL[]> {
  const supabase = createClient()

  // Get all billing items joined with completed jobs
  const { data: items, error } = await supabase
    .from('job_billing_items')
    .select('*, jobs!inner(id, title, status, updated_at)')
    .eq('tenant_id', tenantId)
    .eq('jobs.status', 'completed')
  if (error) throw error
  if (!items?.length) return []

  // Group by quarter of job completion date
  const map = new Map<string, QuarterlyPnL>()

  for (const item of items) {
    const job = (item as unknown as { jobs: { id: string; title: string; status: string; updated_at: string } }).jobs
    const d = new Date(job.updated_at)
    const year = d.getFullYear()
    const q = Math.floor(d.getMonth() / 3) + 1
    const key = `${year}-Q${q}`

    if (!map.has(key)) {
      map.set(key, { quarter: `Q${q} ${year}`, year, q, revenue: 0, cost: 0, profit: 0, jobCount: 0, jobs: [] })
    }
    const entry = map.get(key)!
    entry.revenue += item.revenue
    entry.cost += item.cost
    entry.profit += item.revenue - item.cost

    // Track per-job rollup
    const existing = entry.jobs.find(j => j.id === job.id)
    if (existing) {
      existing.revenue += item.revenue
      existing.cost += item.cost
      existing.profit += item.revenue - item.cost
    } else {
      entry.jobCount++
      entry.jobs.push({
        id: job.id,
        title: job.title,
        revenue: item.revenue,
        cost: item.cost,
        profit: item.revenue - item.cost,
        completedAt: job.updated_at,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.year !== b.year ? b.year - a.year : b.q - a.q)
}
