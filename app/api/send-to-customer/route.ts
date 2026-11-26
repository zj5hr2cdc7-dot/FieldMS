import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireActiveAccess } from '@/lib/authz'
import { sendCustomerLink, describeDelivery } from '@/lib/notifications'

/**
 * POST /api/send-to-customer — email a quote or invoice link to the customer.
 *
 * Body: { type: 'quote' | 'invoice', id: string, email?: string }
 *
 * Quotes and invoices could only be shared by copying a link and pasting it
 * into your own email. This sends it from FieldMS with the business name on
 * it. Email only: the address is either given by the user or taken from the
 * quote or job, and texts are left to the existing job notifications so a
 * send here never spends the SMS allowance by surprise.
 *
 * Like /api/documents/send, nothing is recorded as sent unless the email
 * provider accepted it.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const type = body?.type as 'quote' | 'invoice' | undefined
  const id = body?.id as string | undefined
  const override = typeof body?.email === 'string' ? body.email.trim() : ''
  if ((type !== 'quote' && type !== 'invoice') || !id) {
    return NextResponse.json({ error: 'type and id are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  let tenantId: string
  let customerName: string | null = null
  let toEmail: string | null = null
  let path: string
  let label: string
  let jobId: string | null = null

  if (type === 'quote') {
    const { data: est } = await admin
      .from('estimates')
      .select('id, business_id, customer_name, customer_email, public_token, job_id, status, total')
      .eq('id', id)
      .single()
    if (!est || !est.public_token) return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    tenantId = est.business_id
    customerName = est.customer_name
    toEmail = est.customer_email
    jobId = est.job_id
    path = `/quote/${est.public_token}`
    label = 'quote'
  } else {
    const { data: inv } = await admin
      .from('job_invoices')
      .select('id, tenant_id, job_id, invoice_number, public_token, status')
      .eq('id', id)
      .single()
    if (!inv || !inv.public_token) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    tenantId = inv.tenant_id
    jobId = inv.job_id
    path = `/invoice/${inv.public_token}`
    label = `invoice ${inv.invoice_number}`
  }

  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Every send costs money, so it stops when the trial does. Reading and
  // exporting stay open, and the customer-facing token routes are NOT gated:
  // their customer is not the one whose trial ran out.
  const access = await requireActiveAccess(tenantId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  if (jobId && (!toEmail || !customerName)) {
    const { data: job } = await admin.from('jobs').select('customer_name, customer_email').eq('id', jobId).maybeSingle()
    toEmail = toEmail || job?.customer_email || null
    customerName = customerName || job?.customer_name || null
  }
  if (override) toEmail = override

  if (!toEmail || !EMAIL_RE.test(toEmail)) {
    return NextResponse.json(
      { error: 'No customer email. Add one and try again.', needsEmail: true },
      { status: 400 }
    )
  }

  const [{ data: tenant }, { data: branding }, { data: profile }] = await Promise.all([
    admin.from('tenants').select('name').eq('id', tenantId).single(),
    admin.from('tenant_branding').select('trading_name, email_signature').eq('tenant_id', tenantId).maybeSingle(),
    admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ])

  const businessName = branding?.trading_name || tenant?.name || 'Your contractor'
  const sender = profile?.full_name || businessName
  const url = `${new URL(request.url).origin}${path}`
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const signatureHtml = branding?.email_signature
    ? `<p style="color:#64748b;font-size:13px;white-space:pre-wrap">${esc(branding.email_signature)}</p>`
    : ''
  const action = type === 'quote' ? 'View and approve your quote' : 'View your invoice'

  const delivery = await sendCustomerLink({
    tenantId,
    businessName,
    customerPhone: null,
    customerEmail: toEmail,
    subject: `Your ${label} from ${businessName}`,
    text: `${businessName}: your ${label} is ready. ${action}: ${url}`,
    html: `
      <p>Hi ${esc(customerName || 'there')},</p>
      <p>${esc(sender)} from <strong>${esc(businessName)}</strong> has sent your ${esc(label)}.</p>
      <p><a href="${url}">${action} →</a></p>
      ${signatureHtml}
    `,
  })

  if (delivery.email.status !== 'sent') {
    return NextResponse.json({ error: describeDelivery(delivery), delivery }, { status: 502 })
  }

  const now = new Date().toISOString()
  if (type === 'quote') {
    await admin.from('estimates')
      .update({ sent_at: now, customer_email: toEmail })
      .eq('id', id)
  } else {
    await admin.from('job_invoices')
      .update({ sent_at: now, status: 'sent' })
      .eq('id', id)
      .eq('status', 'draft')
    await admin.from('job_invoices').update({ sent_at: now }).eq('id', id).is('sent_at', null)
    await admin.from('billing_audit_events').insert({
      tenant_id: tenantId,
      job_id: jobId,
      event_type: 'invoice_sent',
      actor_name: sender,
      meta: { to_email: toEmail },
    })
  }

  return NextResponse.json({ ok: true, to: toEmail, message: `Emailed to ${toEmail}.` })
}
