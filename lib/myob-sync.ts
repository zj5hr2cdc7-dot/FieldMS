/**
 * MYOB Business / AccountRight sync.
 *
 * ── READ THIS BEFORE SWITCHING IT ON ───────────────────────────────────────
 * This has NEVER been run against a real MYOB company file. It was written
 * from MYOB's published API reference, and two things in it could not be
 * verified from the documentation:
 *
 *   1. How the created record's UID comes back from a POST. MYOB documents
 *      201 Created with a Location header holding the new resource URI, but
 *      the reference does not spell out the response body. `extractUid()`
 *      therefore tries the Location header, then several body shapes, and
 *      THROWS a specific error if none of them yield a UID — rather than
 *      returning undefined and letting a half-synced invoice look successful.
 *
 *   2. Whether a given company file needs the `x-myobapi-cftoken` header.
 *      Cloud MYOB Business files generally do not; on-premise AccountRight
 *      files do. It is sent when MYOB_CF_TOKEN is set and omitted otherwise.
 *
 * `preflightMyob()` exists precisely so those get checked against a real file
 * BEFORE anything writes to a business's accounts. Run it from the
 * integrations screen; do not enable sync until it passes.
 *
 * Why this matters more than usual: a wrong field name here does not produce
 * a tidy error, it produces duplicate or orphaned invoices in somebody's
 * books, and accounting software is the one place a business will not forgive
 * a mess. Failing loudly is the whole design.
 *
 * ── WHY IT EXISTS ──────────────────────────────────────────────────────────
 * You could already connect MYOB through OAuth and FieldMS would never sync
 * anything: lib/accounting-sync.ts contains no MYOB code at all. A connect
 * button that does nothing is the clearest broken promise in the product.
 *
 * Shape deliberately mirrors syncJobToXero: stage an idempotency record,
 * push, mark synced or mark error. See lib/accounting-sync.ts.
 */

import { createAdminClient } from '@/utils/supabase/admin'
import {
  buildInvoicePayloadForJob,
  buildPaymentPayload,
  stageSyncRecord,
  markSynced,
  markSyncError,
  idempotencyKey,
} from '@/lib/accounting-sync'
import type { IntegrationProvider } from '@/types/database'

const API_ROOT = 'https://api.myob.com/accountright'

export interface MyobConnection {
  accessToken: string
  /** CompanyFileUid, stored as integrations.external_account_id. */
  companyFileId: string
}

function headers(conn: MyobConnection, extra: Record<string, string> = {}) {
  const apiKey = process.env.MYOB_API_KEY
  if (!apiKey) throw new Error('MYOB_API_KEY is not set on this deployment')

  const base: Record<string, string> = {
    Authorization: `Bearer ${conn.accessToken}`,
    'x-myobapi-key': apiKey,
    'x-myobapi-version': process.env.MYOB_API_VERSION ?? 'v2',
    Accept: 'application/json',
    ...extra,
  }

  // Only on-premise AccountRight company files require this. Sending an empty
  // one is worse than omitting it.
  const cfToken = process.env.MYOB_CF_TOKEN
  if (cfToken) base['x-myobapi-cftoken'] = cfToken

  return base
}

/**
 * Pull the created record's UID out of a MYOB response.
 *
 * UNVERIFIED — see the file header. Tries, in order: the Location header
 * (documented for 201 Created), then the shapes a JSON body might use. Throws
 * rather than returning undefined, because an invoice we cannot identify is an
 * invoice we cannot attach payments to, and silently carrying on would orphan
 * them in the customer's books.
 */
export function extractUid(res: Response, body: unknown): string {
  const location = res.headers.get('location') ?? res.headers.get('Location')
  if (location) {
    // ".../Sale/Invoice/Service/{uid}" — the UID is the last path segment.
    const uid = location.split('?')[0].replace(/\/+$/, '').split('/').pop()
    if (uid && /^[0-9a-f-]{30,}$/i.test(uid)) return uid
  }

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>
    for (const key of ['UID', 'Uid', 'uid', 'Id', 'id']) {
      const value = b[key]
      if (typeof value === 'string' && value.length >= 30) return value
    }
  }

  throw new Error(
    'MYOB accepted the request but no record UID could be read from the Location header or the ' +
      'response body. Sync is halted so nothing is left half-written. Run the MYOB preflight and ' +
      'check extractUid() in lib/myob-sync.ts against what your company file actually returns.'
  )
}

async function myobFetch(
  conn: MyobConnection,
  path: string,
  init: RequestInit = {}
): Promise<{ res: Response; body: unknown }> {
  const res = await fetch(`${API_ROOT}/${conn.companyFileId}${path}`, {
    ...init,
    headers: headers(conn, init.body ? { 'Content-Type': 'application/json' } : {}),
  })

  const text = await res.text()
  let body: unknown = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }

  if (!res.ok) {
    throw new Error(`MYOB ${init.method ?? 'GET'} ${path} failed (${res.status}): ${text.slice(0, 500)}`)
  }

  return { res, body }
}

/**
 * MYOB will not accept a customer name on an invoice the way Xero does: the
 * Customer block needs the UID of an existing Card. Look one up by name.
 *
 * Deliberately does NOT create a missing customer. Silently adding contacts to
 * somebody's MYOB contact list is not ours to do, and a typo in a job would
 * quietly pollute their file. Missing customers are reported instead.
 */
export async function findCustomerUid(
  conn: MyobConnection,
  customerName: string
): Promise<string | null> {
  const filter = encodeURIComponent(`CompanyName eq '${customerName.replace(/'/g, "''")}'`)
  const { body } = await myobFetch(conn, `/Contact/Customer?$filter=${filter}&$top=1`)

  const items = (body as { Items?: { UID?: string }[] } | null)?.Items
  return items?.[0]?.UID ?? null
}

/**
 * Validate a MYOB connection end to end without writing anything.
 *
 * Run this before enabling sync for a tenant. It is the difference between
 * "the field names in this file are wrong" showing up here, and showing up as
 * a mess in a real set of books.
 */
export async function preflightMyob(conn: MyobConnection): Promise<{
  ok: boolean
  checks: { name: string; ok: boolean; detail: string }[]
}> {
  const checks: { name: string; ok: boolean; detail: string }[] = []

  const check = async (name: string, fn: () => Promise<string>) => {
    try {
      checks.push({ name, ok: true, detail: await fn() })
    } catch (err) {
      checks.push({ name, ok: false, detail: err instanceof Error ? err.message : String(err) })
    }
  }

  await check('API key configured', async () => {
    if (!process.env.MYOB_API_KEY) throw new Error('MYOB_API_KEY is not set')
    return 'present'
  })

  await check('Company file reachable', async () => {
    const { body } = await myobFetch(conn, '/Company')
    const name = (body as { CompanyName?: string } | null)?.CompanyName
    return name ? `connected to "${name}"` : 'connected'
  })

  await check('Can read customers', async () => {
    const { body } = await myobFetch(conn, '/Contact/Customer?$top=1')
    const count = (body as { Items?: unknown[] } | null)?.Items?.length ?? 0
    return `${count} customer record(s) readable`
  })

  await check('Can read invoices', async () => {
    const { body } = await myobFetch(conn, '/Sale/Invoice/Service?$top=1')
    const count = (body as { Items?: unknown[] } | null)?.Items?.length ?? 0
    return `${count} invoice(s) readable`
  })

  return { ok: checks.every((c) => c.ok), checks }
}

/**
 * Shape a FieldMS invoice payload into MYOB's Service invoice format.
 *
 * Note what the input actually is: buildInvoicePayloadForJob() returns a
 * XERO-shaped payload (Type:'ACCREC', Contact, LineItems, UnitAmount,
 * AccountCode) because Xero was the only integration when it was written. So
 * this is a Xero -> MYOB translation, not a neutral one. If that function is
 * ever made provider-agnostic, this mapping has to move with it.
 */
export interface XeroShapedInvoice {
  Contact?: { Name?: string }
  LineItems?: { Description: string; Quantity: number; UnitAmount: number }[]
  Reference?: string
}

function toMyobInvoice(payload: XeroShapedInvoice, customerUid: string) {
  const lines = payload.LineItems ?? []

  return {
    Customer: { UID: customerUid },
    Date: new Date().toISOString(),
    // Service invoices take free-text lines, which is what a trade job
    // produces. Item invoices would require every material to already exist as
    // an inventory item in their file, which is not a safe assumption.
    Lines: lines.map((line) => ({
      Type: 'Transaction',
      Description: line.Description,
      Total: Number((line.Quantity * line.UnitAmount).toFixed(2)),
    })),
    // FieldMS stores and bills ex GST (see job_invoices.subtotal_ex_gst), so
    // MYOB must not treat these totals as GST-inclusive or every invoice is
    // short by the GST.
    IsTaxInclusive: false,
    JournalMemo: payload.Reference,
  }
}

/**
 * Full sync pass for one job. Mirrors syncJobToXero: idempotent, resumable,
 * and one failed payment does not block the rest.
 */
export async function syncJobToMyob(
  tenantId: string,
  jobId: string,
  conn: MyobConnection
): Promise<{ invoice: string; payments: number; skipped: boolean }> {
  const provider: IntegrationProvider = 'myob'
  const admin = createAdminClient()

  const { payload: invoicePayload } = await buildInvoicePayloadForJob(jobId)

  const invoice = invoicePayload as XeroShapedInvoice
  const customerName = invoice.Contact?.Name
  if (!customerName || customerName === 'Unknown customer') {
    throw new Error('This job has no customer name, so it cannot be matched to a contact in MYOB')
  }

  const customerUid = await findCustomerUid(conn, customerName)
  if (!customerUid) {
    throw new Error(
      `"${customerName}" does not exist as a customer in your MYOB file. Add them in MYOB first — ` +
        'FieldMS will not create contacts in your accounts on your behalf.'
    )
  }

  // 1. Invoice
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
      const { res, body } = await myobFetch(conn, '/Sale/Invoice/Service', {
        method: 'POST',
        body: JSON.stringify(toMyobInvoice(invoice, customerUid)),
      })
      invoiceExternalId = extractUid(res, body)
      await markSynced(invoiceRecord.id, invoiceExternalId)
    } catch (err) {
      await markSyncError(invoiceRecord.id, err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  // 2. Payments
  const { data: payments } = await admin.from('job_payments').select('id').eq('job_id', jobId)
  let syncedPayments = 0

  for (const payment of payments || []) {
    const { payload } = await buildPaymentPayload(payment.id, invoiceExternalId)
    const record = await stageSyncRecord(tenantId, provider, 'payment', payment.id, payload)
    if (record === null) continue

    try {
      // Xero-shaped too: { Invoice, Account, Date, Amount, Reference }.
      const p = payload as { Date?: string; Amount?: number; Reference?: string }
      const amount = Number(p.Amount ?? 0)
      const { res, body } = await myobFetch(conn, '/Sale/CustomerPayment', {
        method: 'POST',
        body: JSON.stringify({
          Customer: { UID: customerUid },
          Date: p.Date ?? new Date().toISOString().slice(0, 10),
          AmountReceived: amount,
          Memo: p.Reference,
          Invoices: [{ UID: invoiceExternalId, AmountApplied: amount }],
        }),
      })
      await markSynced(record.id, extractUid(res, body))
      syncedPayments += 1
    } catch (err) {
      await markSyncError(record.id, err instanceof Error ? err.message : String(err))
      // Keep going: one failed payment should not block the others.
    }
  }

  return { invoice: invoiceExternalId, payments: syncedPayments, skipped: invoiceRecord === null }
}
