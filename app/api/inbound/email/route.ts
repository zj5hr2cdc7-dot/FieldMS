import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { processInboundEmail } from '@/lib/supplier-bills'

export const runtime = 'nodejs'
// Reading a PDF with Claude takes a few seconds to tens of seconds.
export const maxDuration = 60

/**
 * POST /api/inbound/email — Resend's email.received webhook for
 * invoices.fieldms.com.au. Signature-checked (Svix) before anything is read,
 * since this endpoint is public and writes job costs.
 */
export async function POST(request: Request) {
  const secret = process.env.RESEND_INBOUND_WEBHOOK_SECRET
  if (!secret) return new NextResponse('Inbound email not configured', { status: 503 })

  const payload = await request.text()
  let event: ReturnType<Resend['webhooks']['verify']>
  try {
    const resend = new Resend(process.env.RESEND_RECEIVING_KEY || process.env.RESEND_API_KEY || 're_unused')
    event = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get('svix-id') ?? '',
        timestamp: request.headers.get('svix-timestamp') ?? '',
        signature: request.headers.get('svix-signature') ?? '',
      },
      webhookSecret: secret,
    })
  } catch {
    return new NextResponse('Invalid signature', { status: 401 })
  }

  if (event.type !== 'email.received') return NextResponse.json({ ok: true, ignored: event.type })

  try {
    const result = await processInboundEmail({
      email_id: event.data.email_id,
      to: event.data.to,
      cc: event.data.cc,
      from: event.data.from,
      subject: event.data.subject,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    // A 500 makes Resend retry, which is what we want for a transient
    // failure (Resend or Anthropic briefly unavailable). Processing is
    // idempotent on the email id, so a retry cannot double-cost a job.
    console.error('Inbound email failed:', err)
    return new NextResponse('Processing failed', { status: 500 })
  }
}
