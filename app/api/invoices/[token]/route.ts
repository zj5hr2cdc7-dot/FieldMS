import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function getInvoiceByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('job_invoices')
    .select('*, job_invoice_items(*)')
    .eq('public_token', token)
    .single()
  return data
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const invoice = await getInvoiceByToken(token)
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const [{ data: job }, { data: tenant }, { data: branding }] = await Promise.all([
    admin.from('jobs').select('title, customer_name, customer_address, po_number').eq('id', invoice.job_id).single(),
    admin.from('tenants').select('name, abn, phone, website').eq('id', invoice.tenant_id).single(),
    admin.from('tenant_branding').select('trading_name, electrical_license, business_address, primary_color, secondary_color, accent_color, font_family, logo_path, footer_text, acn').eq('tenant_id', invoice.tenant_id).single(),
  ])

  let logoUrl: string | null = null
  if (branding?.logo_path) {
    const { data: signed } = await admin.storage.from('branding').createSignedUrl(branding.logo_path, 3600)
    logoUrl = signed?.signedUrl ?? null
  }

  // Mark as viewed (only escalate from sent/draft)
  if (['draft', 'sent'].includes(invoice.status)) {
    await admin.from('job_invoices').update({ status: 'viewed' }).eq('id', invoice.id)
    await admin.from('billing_audit_events').insert({
      tenant_id: invoice.tenant_id,
      job_id: invoice.job_id,
      event_type: 'invoice_viewed',
      amount: Number(invoice.total_inc_gst),
      meta: { invoice_number: invoice.invoice_number, via: 'customer_portal' },
    })
  }

  const items = ((invoice.job_invoice_items as Record<string, unknown>[]) || [])
    .map((i) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), amount: Number(i.amount), sort: Number(i.sort) }))
    .sort((a, b) => a.sort - b.sort)

  return NextResponse.json({
    invoice: {
      invoice_number: invoice.invoice_number,
      kind: invoice.kind,
      status: invoice.status,
      subtotal_ex_gst: Number(invoice.subtotal_ex_gst),
      gst_amount: Number(invoice.gst_amount),
      total_inc_gst: Number(invoice.total_inc_gst),
      discount: Number(invoice.discount),
      amount_paid: Number(invoice.amount_paid),
      due_date: invoice.due_date,
      issued_at: invoice.issued_at,
      notes: invoice.notes,
      items,
    },
    job: job ?? null,
    business: tenant ?? null,
    branding: branding ?? null,
    logo_url: logoUrl,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const invoice = await getInvoiceByToken(token)
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const action = body?.action as 'approve' | undefined
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (action !== 'approve') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Please provide your name.' }, { status: 400 })

  await admin.from('billing_audit_events').insert({
    tenant_id: invoice.tenant_id,
    job_id: invoice.job_id,
    event_type: 'invoice_approved',
    actor_name: name,
    amount: Number(invoice.total_inc_gst),
    meta: { invoice_number: invoice.invoice_number, via: 'customer_portal' },
  })

  return NextResponse.json({ ok: true })
}
