import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { sendCustomerLink } from '@/lib/notifications'

/**
 * POST /api/reports/send
 * Body: { reportId: string }
 * Sends the public report link to the job's customer via SMS + email,
 * branded with the business name (never "sent from FieldMS").
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const reportId = body?.reportId as string | undefined
  if (!reportId) {
    return NextResponse.json({ error: 'reportId is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: report } = await admin.from('job_reports').select('*').eq('id', reportId).single()
  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', report.tenant_id)
    .eq('user_id', user.id)
    .single()
  if (!membership) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [{ data: job }, { data: tenant }] = await Promise.all([
    admin.from('jobs').select('title, customer_name, customer_phone, customer_email').eq('id', report.job_id).single(),
    admin.from('tenants').select('name').eq('id', report.tenant_id).single(),
  ])
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }
  if (!job.customer_phone && !job.customer_email) {
    return NextResponse.json({ error: 'Job has no customer phone or email on file.' }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const url = `${origin}/report/${report.token}`
  const businessName = tenant?.name || 'Your electrician'

  await sendCustomerLink({
    businessName,
    customerPhone: job.customer_phone,
    customerEmail: job.customer_email,
    subject: `${report.title} — ${businessName}`,
    text: `${businessName} has shared a site report for "${job.title}" with photos: ${url}`,
    html: `<p><strong>${businessName}</strong> has shared a site report for <strong>${job.title}</strong>.</p><p><a href="${url}">View the report with photos →</a></p>`,
  })

  await admin.from('job_reports').update({ sent_at: new Date().toISOString() }).eq('id', reportId)

  return NextResponse.json({ ok: true })
}
