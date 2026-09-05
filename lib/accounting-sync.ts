/**
 * Accounting sync foundation (Xero-first).
 *
 * Design goals, driven by the #1 competitor complaint (Jobber's QuickBooks sync):
 *  1. Idempotency — every entity gets a stable idempotency key. Retries update
 *     the same ledger row and send the same key to the provider, so a flaky
 *     network can never create duplicate invoices.
 *  2. Partial payments & deposits are first-class — each job_payment syncs as
 *     its own payment against the invoice, never by mutating invoice totals.
 *  3. Change detection — a payload hash means unchanged records are skipped
 *     instead of re-pushed (re-pushing is how sync loops corrupt data).
 *
 * Server-side only (uses the admin client). Called from
 * app/api/integrations/xero/sync/route.ts.
 */

import { createAdminClient } from '@/utils/supabase/admin'
import type { AccountingSyncRecord, IntegrationProvider, SyncEntityType } from '@/types/database'
import { createHash } from 'crypto'

export function idempotencyKey(provider: IntegrationProvider, entityType: SyncEntityType, entityId: string) {
  return `${provider}:${entityType}:${entityId}`
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

/** Draft Xero invoice payload built from a job's billing items. */
export async function buildInvoicePayloadForJob(jobId: string) {
  const admin = createAdminClient()

  const [{ data: job }, { data: items }] = await Promise.all([
    admin.from('jobs').select('id, tenant_id, title, customer_name, customer_email').eq('id', jobId).single(),
    admin.from('job_billing_items').select('*').eq('job_id', jobId),
  ])

  if (!job) throw new Error('Job not found')
  if (!items?.length) throw new Error('Job has no billing items to invoice')

  return {
    job,
    payload: {
      Type: 'ACCREC',
      Contact: { Name: job.customer_name || 'Unknown customer' },
      LineItems: items.map((item: { description: string; hours: number; rate_per_hour: number; markup_percent: number; kind?: string; quantity?: number; unit_cost?: number }) => {
        const markup = 1 + Number(item.markup_percent) / 100
        // Material rows bill quantity × unit cost; labour rows bill hours × rate
        const isMaterial = item.kind === 'material'
        return {
          Description: item.description,
          Quantity: isMaterial ? Number(item.quantity ?? 1) : Number(item.hours),
          UnitAmount: (isMaterial ? Number(item.unit_cost ?? 0) : Number(item.rate_per_hour)) * markup,
          AccountCode: '200',
        }
      }),
      Status: 'DRAFT',
      Reference: `FieldMS job ${job.id.slice(0, 8)}`,
    },
  }
}

/** Xero payment payload for a single job payment (deposit / progress / final). */
export async function buildPaymentPayload(paymentId: string, invoiceExternalId: string) {
  const admin = createAdminClient()
  const { data: payment } = await admin.from('job_payments').select('*').eq('id', paymentId).single()
  if (!payment) throw new Error('Payment not found')

  return {
    payment,
    payload: {
      Invoice: { InvoiceID: invoiceExternalId },
      Account: { Code: '090' },
      Date: payment.received_at?.slice(0, 10),
      Amount: Number(payment.amount),
      Reference: payment.reference || `${payment.kind} via FieldMS`,
    },
  }
}

/**
 * Upserts a ledger row for an entity and returns it. If the payload hasn't
 * changed since the last successful sync, returns null (nothing to do).
 */
export async function stageSyncRecord(
  tenantId: string,
  provider: IntegrationProvider,
  entityType: SyncEntityType,
  entityId: string,
  payload: unknown
): Promise<AccountingSyncRecord | null> {
  const admin = createAdminClient()
  const key = idempotencyKey(provider, entityType, entityId)
  const payloadHash = hashPayload(payload)

  const { data: existing } = await admin
    .from('accounting_sync_records')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('idempotency_key', key)
    .single()

  if (existing && existing.status === 'synced' && existing.payload_hash === payloadHash) {
    return null // unchanged — skip instead of re-pushing
  }

  const { data, error } = await admin
    .from('accounting_sync_records')
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        entity_type: entityType,
        entity_id: entityId,
        idempotency_key: key,
        payload_hash: payloadHash,
        status: 'pending',
      },
      { onConflict: 'tenant_id,idempotency_key' }
    )
    .select()
    .single()

  if (error) throw error
  return data as AccountingSyncRecord
}

export async function markSynced(recordId: string, externalId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('accounting_sync_records')
    .update({ status: 'synced', external_id: externalId, last_error: null, last_synced_at: new Date().toISOString() })
    .eq('id', recordId)
  if (error) throw error
}

export async function markSyncError(recordId: string, message: string): Promise<void> {
  const admin = createAdminClient()
  const { data: record } = await admin
    .from('accounting_sync_records')
    .select('attempts')
    .eq('id', recordId)
    .single()
  await admin
    .from('accounting_sync_records')
    .update({ status: 'error', last_error: message, attempts: (record?.attempts ?? 0) + 1 })
    .eq('id', recordId)
}

/**
 * Pushes a payload to Xero. The idempotency key is sent as Xero's
 * `Idempotency-Key` header — Xero deduplicates on their side too, so even a
 * crash between the API call and markSynced can't double-create.
 */
export async function pushToXero(
  accessToken: string,
  xeroTenantId: string,
  endpoint: 'Invoices' | 'Payments',
  payload: unknown,
  key: string
): Promise<{ externalId: string }> {
  const res = await fetch(`https://api.xero.com/api.xro/2.0/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Idempotency-Key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero ${endpoint} sync failed (${res.status}): ${text.slice(0, 500)}`)
  }

  const body = await res.json()
  const entity = body?.[endpoint]?.[0]
  const externalId = entity?.InvoiceID || entity?.PaymentID
  if (!externalId) throw new Error(`Xero response missing ${endpoint} id`)
  return { externalId }
}

/**
 * Full sync pass for one job: invoice first, then any unsynced payments
 * against that invoice. Safe to call repeatedly.
 */
export async function syncJobToXero(
  tenantId: string,
  jobId: string,
  accessToken: string,
  xeroTenantId: string
): Promise<{ invoice: string; payments: number; skipped: boolean }> {
  const provider: IntegrationProvider = 'xero'
  const admin = createAdminClient()

  // 1. Invoice
  const { payload: invoicePayload } = await buildInvoicePayloadForJob(jobId)
  const invoiceRecord = await stageSyncRecord(tenantId, provider, 'invoice', jobId, invoicePayload)

  let invoiceExternalId: string
  if (invoiceRecord === null) {
    const { data: existing } = await admin
      .from('accounting_sync_records')
      .select('external_id')
      .eq('tenant_id', tenantId)
      .eq('idempotency_key', idempotencyKey(provider, 'invoice', jobId))
      .single()
    invoiceExternalId = existing!.external_id!
  } else {
    try {
      const { externalId } = await pushToXero(accessToken, xeroTenantId, 'Invoices', invoicePayload, invoiceRecord.idempotency_key)
      await markSynced(invoiceRecord.id, externalId)
      invoiceExternalId = externalId
    } catch (err) {
      await markSyncError(invoiceRecord.id, err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  // 2. Payments (deposits + partials), each as its own idempotent record
  const { data: payments } = await admin.from('job_payments').select('id').eq('job_id', jobId)
  let syncedPayments = 0

  for (const payment of payments || []) {
    const { payload } = await buildPaymentPayload(payment.id, invoiceExternalId)
    const record = await stageSyncRecord(tenantId, provider, 'payment', payment.id, payload)
    if (record === null) continue // already synced, unchanged
    try {
      const { externalId } = await pushToXero(accessToken, xeroTenantId, 'Payments', payload, record.idempotency_key)
      await markSynced(record.id, externalId)
      syncedPayments += 1
    } catch (err) {
      await markSyncError(record.id, err instanceof Error ? err.message : String(err))
      // keep going — one failed payment shouldn't block the rest
    }
  }

  return { invoice: invoiceExternalId, payments: syncedPayments, skipped: invoiceRecord === null }
}
