import { NextResponse } from 'next/server'
import { requireJobAccess } from '@/lib/authz'
import { loadJobMessageContext, missingForJob, renderForJob, sendAndLog } from '@/lib/customer-messaging'

/**
 * POST /api/messages/send — preview or send a templated message to a job's
 * customer.
 *
 * Body: { jobId, templateKey?, templateName?, subject, sms_body, email_body,
 *         channels: { sms, email }, preview? }
 *
 * The recipient always comes from the job, and merge fields are filled here
 * from the database, never from the request. Any member of the job's
 * business can send (a technician texting "running late" is the point).
 */

const MAX_LEN = 5000

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Malformed request' }, { status: 400 })
  }

  const jobId = typeof body.jobId === 'string' ? body.jobId : ''
  if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const str = (v: unknown) => (typeof v === 'string' ? v.slice(0, MAX_LEN) : '')
  const template = { subject: str(body.subject), sms_body: str(body.sms_body), email_body: str(body.email_body) }
  const wantSms = body.channels?.sms === true
  const wantEmail = body.channels?.email === true

  const ctx = await loadJobMessageContext(jobId, new URL(request.url).origin, authz.userId)
  if (!ctx) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const channels = {
    sms: wantSms && !!ctx.job.customer_phone && !!template.sms_body.trim(),
    email: wantEmail && !!ctx.job.customer_email && !!template.email_body.trim(),
  }
  const rendered = renderForJob(ctx, template)
  const missing = missingForJob(ctx, template, channels)

  if (body.preview === true) {
    return NextResponse.json({
      subject: rendered.subject,
      sms: rendered.sms,
      emailText: rendered.emailText,
      missing,
      to: { phone: ctx.job.customer_phone, email: ctx.job.customer_email },
    })
  }

  if (!channels.sms && !channels.email) {
    return NextResponse.json(
      { error: 'Nothing to send: the job has no phone or email for the channel you picked.' },
      { status: 400 }
    )
  }
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `This job has nothing to fill in for: ${missing.map((m) => `{${m}}`).join(', ')}`, missing },
      { status: 400 }
    )
  }

  await sendAndLog({
    ctx,
    rendered,
    channels,
    templateKey: typeof body.templateKey === 'string' ? body.templateKey : null,
    templateName: typeof body.templateName === 'string' ? body.templateName.slice(0, 200) : null,
    source: 'manual',
    sentBy: authz.userId,
  })

  return NextResponse.json({ ok: true, sentSms: channels.sms, sentEmail: channels.email })
}
