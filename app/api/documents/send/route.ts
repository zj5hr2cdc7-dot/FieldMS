import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendCustomerLink } from '@/lib/notifications'

/**
 * POST /api/documents/send — email/SMS the branded document link to the
 * job's customer. Subject and body carry the business identity, technician
 * name and the tenant's email signature.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const submissionId = body?.submissionId as string | undefined
  if (!submissionId) return NextResponse.json({ error: 'submissionId is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: submission } = await admin.from('form_submissions').select('*').eq('id', submissionId).single()
  if (!submission) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', submission.tenant_id)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: job }, { data: tenant }, { data: branding }, { data: profile }] = await Promise.all([
    submission.job_id
      ? admin.from('jobs').select('title, customer_name, customer_phone, customer_email').eq('id', submission.job_id).single()
      : Promise.resolve({ data: null }),
    admin.from('tenants').select('name').eq('id', submission.tenant_id).single(),
    admin.from('tenant_branding').select('trading_name, email_signature').eq('tenant_id', submission.tenant_id).single(),
    admin.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  if (!job?.customer_phone && !job?.customer_email) {
    return NextResponse.json({ error: 'The linked job has no customer phone or email.' }, { status: 400 })
  }

  const businessName = branding?.trading_name || tenant?.name || 'Your contractor'
  const technicianName = profile?.full_name || 'Our technician'
  const origin = new URL(request.url).origin
  const url = `${origin}/document/${submission.public_token}`
  const docTitle = submission.template_name
  const subject = `Your ${docTitle} — ${businessName}`
  const signatureHtml = branding?.email_signature ? `<p style="color:#64748b;font-size:13px;white-space:pre-wrap">${branding.email_signature}</p>` : ''

  await sendCustomerLink({
    businessName,
    customerPhone: job?.customer_phone,
    customerEmail: job?.customer_email,
    subject,
    text: `${businessName}: your ${docTitle}${submission.doc_number ? ` (${submission.doc_number})` : ''} is ready. View, download or sign here: ${url}`,
    html: `
      <p>Hi ${job?.customer_name || 'there'},</p>
      <p>${technicianName} from <strong>${businessName}</strong> has shared your <strong>${docTitle}</strong>${
        submission.doc_number ? ` (document ${submission.doc_number})` : ''
      }.</p>
      <p><a href="${url}">View, download or sign the document →</a></p>
      ${signatureHtml}
    `,
  })

  await admin.from('form_audit_events').insert({
    submission_id: submission.id,
    tenant_id: submission.tenant_id,
    event_type: 'sent',
    actor_name: technicianName,
    meta: { to_email: job?.customer_email, to_phone: job?.customer_phone },
  })

  return NextResponse.json({ ok: true })
}
