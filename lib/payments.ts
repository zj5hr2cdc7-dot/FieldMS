import type { JobPayment, PaymentKind } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

export async function getPaymentsForJob(jobId: string): Promise<JobPayment[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_payments')
    .select('*')
    .eq('job_id', jobId)
    .order('received_at', { ascending: true })
  if (error) throw error
  return (data || []).map((p: { amount: unknown }) => ({ ...p, amount: Number(p.amount) })) as JobPayment[]
}

export async function recordPayment(input: {
  tenantId: string
  jobId: string
  userId: string
  kind: PaymentKind
  amount: number
  method?: string
  reference?: string
  estimateId?: string
  invoiceId?: string
}): Promise<JobPayment> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('job_payments')
    .insert({
      tenant_id: input.tenantId,
      job_id: input.jobId,
      estimate_id: input.estimateId ?? null,
      invoice_id: input.invoiceId ?? null,
      kind: input.kind,
      amount: input.amount,
      method: input.method ?? null,
      reference: input.reference ?? null,
      created_by: input.userId,
    })
    .select()
    .single()
  if (error) throw error
  return { ...data, amount: Number(data.amount) } as JobPayment
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('job_payments').delete().eq('id', paymentId)
  if (error) throw error
}

/** Kick off an idempotent Xero sync for a job (invoice + payments). */
export async function syncJobToAccounting(jobId: string): Promise<{
  ok: boolean
  payments_synced?: number
  invoice_unchanged?: boolean
  error?: string
}> {
  const res = await fetch('/api/integrations/xero/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }),
  })
  const body = await res.json()
  if (!res.ok) return { ok: false, error: body.error || 'Sync failed' }
  return { ok: true, ...body }
}
