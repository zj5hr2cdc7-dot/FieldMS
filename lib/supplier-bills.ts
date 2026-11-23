/**
 * Supplier bills by email (migration 041).
 *
 * Each workspace has an address, bills-<token>@invoices.fieldms.com.au. A
 * wholesaler (or the tradie, forwarding) sends an invoice there, Resend calls
 * /api/inbound/email, and this module:
 *
 *   1. works out which workspace it is for, from the token in the address
 *   2. fetches the email and its PDF from Resend (the webhook carries neither)
 *   3. reads the invoice with Claude: supplier, number, date, order reference,
 *      lines, totals
 *   4. matches it to a job. An order reference that equals one of the
 *      workspace's purchase order numbers is a sure match, and the bill goes
 *      straight onto that job as a materials cost. Anything else is only a
 *      suggestion and waits for someone in the office to confirm it, because
 *      putting a $4,000 bill on the wrong job is worse than asking.
 *
 * Server only: uses the service role and the Anthropic and Resend keys.
 */
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'

export const INBOX_DOMAIN = 'invoices.fieldms.com.au'
export const inboxAddress = (token: string) => `bills-${token}@${INBOX_DOMAIN}`

const MAX_PDF_BYTES = 15 * 1024 * 1024
const MODEL = 'claude-sonnet-5'

type Admin = ReturnType<typeof createAdminClient>

/** Reading received mail needs a full-access key; sending needs only a sending key. */
function receivingClient(): Resend | null {
  const key = process.env.RESEND_RECEIVING_KEY || process.env.RESEND_API_KEY
  return key ? new Resend(key) : null
}

/** bills-<token>@invoices.fieldms.com.au → token, from any of the To/Cc addresses. */
export function tokenFromAddresses(addresses: string[]): string | null {
  for (const raw of addresses) {
    const addr = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().toLowerCase()
    const m = addr.match(/^bills-([a-f0-9]{6,32})@invoices\.fieldms\.com\.au$/)
    if (m) return m[1]
  }
  return null
}

interface ExtractedLine {
  description: string
  quantity: number | null
  unit_price_ex_gst: number | null
  total_ex_gst: number | null
}

interface Extracted {
  is_invoice: boolean
  supplier_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  reference: string | null
  total_ex_gst: number | null
  gst: number | null
  total_inc_gst: number | null
  lines: ExtractedLine[]
  suggested_job_id: string | null
  match_reason: string | null
}

interface OpenJob {
  id: string
  title: string
  customer_name: string | null
  customer_address: string | null
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'record_supplier_invoice',
  description: 'Record the details of an Australian trade supplier invoice.',
  input_schema: {
    type: 'object',
    properties: {
      is_invoice: { type: 'boolean', description: 'False if this is not a supplier invoice or credit note (e.g. a statement, marketing, a quote).' },
      supplier_name: { type: ['string', 'null'] },
      invoice_number: { type: ['string', 'null'] },
      invoice_date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
      reference: { type: ['string', 'null'], description: "The customer's order number / PO / job reference / 'your ref' as printed, exactly." },
      total_ex_gst: { type: ['number', 'null'] },
      gst: { type: ['number', 'null'] },
      total_inc_gst: { type: ['number', 'null'] },
      lines: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: ['number', 'null'] },
            unit_price_ex_gst: { type: ['number', 'null'] },
            total_ex_gst: { type: ['number', 'null'] },
          },
          required: ['description'],
        },
      },
      suggested_job_id: {
        type: ['string', 'null'],
        description: 'The id of the open job this invoice most likely belongs to, ONLY from the list given, judged from the reference, delivery address or site. Null if unsure.',
      },
      match_reason: { type: ['string', 'null'], description: 'One short sentence on why that job, or why none.' },
    },
    required: ['is_invoice', 'lines'],
  },
}

async function extract(pdfBase64: string, jobs: OpenJob[]): Promise<Extracted> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const jobList = jobs.length
    ? jobs.map((j) => `- ${j.id}: ${j.title}${j.customer_name ? ` | ${j.customer_name}` : ''}${j.customer_address ? ` | ${j.customer_address}` : ''}`).join('\n')
    : '(no open jobs)'

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: EXTRACT_TOOL.name },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
          {
            type: 'text',
            text:
              'Read this supplier invoice for an Australian electrical contractor and record it. ' +
              'Amounts in AUD, as numbers. Credit notes have negative totals. Copy the reference exactly as printed. ' +
              'Then suggest which of these open jobs it belongs to, only if the reference, delivery address or site clearly points to one:\n' +
              jobList,
          },
        ],
      },
    ],
  })

  const block = res.content.find((b) => b.type === 'tool_use')
  if (!block || block.type !== 'tool_use') throw new Error('The invoice could not be read')
  const out = block.input as Partial<Extracted>
  const validIds = new Set(jobs.map((j) => j.id))
  return {
    is_invoice: out.is_invoice !== false,
    supplier_name: out.supplier_name ?? null,
    invoice_number: out.invoice_number ?? null,
    invoice_date: /^\d{4}-\d{2}-\d{2}$/.test(out.invoice_date ?? '') ? out.invoice_date! : null,
    reference: out.reference ?? null,
    total_ex_gst: typeof out.total_ex_gst === 'number' ? out.total_ex_gst : null,
    gst: typeof out.gst === 'number' ? out.gst : null,
    total_inc_gst: typeof out.total_inc_gst === 'number' ? out.total_inc_gst : null,
    lines: Array.isArray(out.lines) ? out.lines.slice(0, 200) : [],
    // Never trust an id the model invented: it must be one we offered.
    suggested_job_id: out.suggested_job_id && validIds.has(out.suggested_job_id) ? out.suggested_job_id : null,
    match_reason: out.match_reason ?? null,
  }
}

/** Ex GST amount to cost against the job. Falls back to inc GST / 1.1. */
export function costExGst(inv: { total_ex_gst: number | null; total_inc_gst: number | null; gst: number | null }): number | null {
  if (inv.total_ex_gst != null) return Math.round(inv.total_ex_gst * 100) / 100
  if (inv.total_inc_gst != null && inv.gst != null) return Math.round((inv.total_inc_gst - inv.gst) * 100) / 100
  if (inv.total_inc_gst != null) return Math.round((inv.total_inc_gst / 1.1) * 100) / 100
  return null
}

/** Put a bill on a job as a materials cost, and mark it assigned. */
export async function assignToJob(admin: Admin, invoiceId: string, jobId: string, userId: string | null): Promise<void> {
  const { data: inv, error } = await admin.from('supplier_invoices').select('*').eq('id', invoiceId).single()
  if (error || !inv) throw new Error('Bill not found')
  const amount = costExGst(inv)
  if (amount == null) throw new Error('This bill has no total to add to the job')

  // Moving a bill from one job to another: remove the old cost first.
  if (inv.cost_entry_id) await admin.from('job_cost_entries').delete().eq('id', inv.cost_entry_id)

  // job_cost_entries only holds non-negative amounts; a credit note is
  // recorded on the bill but not as a cost.
  let costEntryId: string | null = null
  if (amount > 0) {
    const { data: entry, error: costErr } = await admin
      .from('job_cost_entries')
      .insert({
        tenant_id: inv.tenant_id,
        job_id: jobId,
        kind: 'materials',
        description: `Supplier invoice${inv.invoice_number ? ` ${inv.invoice_number}` : ''}${inv.supplier_name ? ` from ${inv.supplier_name}` : ''}`,
        supplier_name: inv.supplier_name,
        reference: inv.invoice_number ?? inv.reference,
        amount_ex_gst: amount,
        incurred_on: inv.invoice_date ?? new Date().toISOString().slice(0, 10),
        created_by: userId,
      })
      .select('id')
      .single()
    if (costErr) throw new Error(costErr.message)
    costEntryId = entry.id
  }

  await admin
    .from('supplier_invoices')
    .update({ job_id: jobId, status: 'assigned', cost_entry_id: costEntryId, updated_at: new Date().toISOString() })
    .eq('id', invoiceId)
}

/** Handle one email.received event. Idempotent on the Resend email id. */
export async function processInboundEmail(event: { email_id: string; to: string[]; cc?: string[]; from: string; subject: string }): Promise<string> {
  const admin = createAdminClient()

  const token = tokenFromAddresses([...(event.to ?? []), ...(event.cc ?? [])])
  if (!token) return 'ignored: not a bills address'
  const { data: inbox } = await admin.from('tenant_inboxes').select('tenant_id').eq('token', token).maybeSingle()
  if (!inbox) return 'ignored: unknown inbox'
  const tenantId = inbox.tenant_id as string

  const { data: existing } = await admin.from('supplier_invoices').select('id').eq('received_email_id', event.email_id).maybeSingle()
  if (existing) return 'ignored: already processed'

  const base = {
    tenant_id: tenantId,
    received_email_id: event.email_id,
    from_email: event.from,
    subject: event.subject,
  }

  const resend = receivingClient()
  if (!resend) {
    await admin.from('supplier_invoices').insert({ ...base, status: 'unreadable', error: 'Email reading is not set up (RESEND_RECEIVING_KEY).' })
    return 'stored: no receiving key'
  }

  // Find the PDF. Most wholesalers attach one invoice per email.
  const { data: list, error: listErr } = await resend.emails.receiving.attachments.list({ emailId: event.email_id })
  if (listErr) throw new Error(`Could not list attachments: ${listErr.message}`)
  const pdf = (list?.data ?? []).find(
    (a) => a.content_type === 'application/pdf' || (a.filename ?? '').toLowerCase().endsWith('.pdf')
  )
  if (!pdf) {
    await admin.from('supplier_invoices').insert({ ...base, status: 'unreadable', error: 'No PDF attached. Ask the supplier to send invoices as PDF attachments.' })
    return 'stored: no pdf'
  }
  if (pdf.size > MAX_PDF_BYTES) {
    await admin.from('supplier_invoices').insert({ ...base, attachment_name: pdf.filename ?? null, status: 'unreadable', error: 'The PDF is too large to read (over 15 MB).' })
    return 'stored: pdf too large'
  }

  const fileRes = await fetch(pdf.download_url)
  if (!fileRes.ok) throw new Error(`Could not download the PDF (${fileRes.status})`)
  const pdfBase64 = Buffer.from(await fileRes.arrayBuffer()).toString('base64')

  const { data: jobs } = await admin
    .from('jobs')
    .select('id, title, customer_name, customer_address')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '(cancelled)')
    .order('created_at', { ascending: false })
    .limit(80)

  let ex: Extracted
  try {
    ex = await extract(pdfBase64, (jobs ?? []) as OpenJob[])
  } catch (err) {
    await admin.from('supplier_invoices').insert({
      ...base,
      attachment_name: pdf.filename ?? null,
      status: 'unreadable',
      error: err instanceof Error ? err.message : 'Could not read the invoice',
    })
    return 'stored: extraction failed'
  }

  // A sure match: the reference is one of this workspace's PO numbers.
  let poJobId: string | null = null
  if (ex.reference) {
    const { data: po } = await admin
      .from('purchase_orders')
      .select('job_id')
      .eq('tenant_id', tenantId)
      .ilike('po_number', ex.reference.trim())
      .not('job_id', 'is', null)
      .maybeSingle()
    poJobId = (po?.job_id as string | undefined) ?? null
  }

  const { data: row, error: insErr } = await admin
    .from('supplier_invoices')
    .insert({
      ...base,
      attachment_name: pdf.filename ?? null,
      supplier_name: ex.supplier_name,
      invoice_number: ex.invoice_number,
      invoice_date: ex.invoice_date,
      reference: ex.reference,
      total_ex_gst: ex.total_ex_gst,
      gst: ex.gst,
      total_inc_gst: ex.total_inc_gst,
      lines: ex.lines,
      suggested_job_id: poJobId ?? ex.suggested_job_id,
      match_reason: poJobId ? `Order reference ${ex.reference} matches your purchase order.` : ex.match_reason,
      status: ex.is_invoice ? 'needs_review' : 'unreadable',
      error: ex.is_invoice ? null : 'This doesn’t look like a supplier invoice.',
    })
    .select('id')
    .single()
  if (insErr) throw new Error(insErr.message)

  if (poJobId && ex.is_invoice) {
    await assignToJob(admin, row.id, poJobId, null)
    return 'assigned by purchase order'
  }
  return 'stored for review'
}
