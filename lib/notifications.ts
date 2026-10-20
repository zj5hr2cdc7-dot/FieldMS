import twilio from 'twilio'
import { Resend } from 'resend'
import type { JobEventType } from '@/types/database'
import { escapeHtml } from '@/lib/message-templates'
import { getSmsQuota, recordSmsAttempt, exhaustedMessage } from '@/lib/sms-quota'

/**
 * Customer notifications (SMS via Twilio, email via Resend).
 *
 * WHAT CHANGED AND WHY
 *   Every send used to end in `if (!client) return` with no error and no log.
 *   Callers then wrote an audit row saying `event_type: 'sent'` and returned
 *   `{ ok: true }`. So with no credentials configured the business saw "Sent",
 *   the customer received nothing, and the audit trail recorded a delivery
 *   that never happened. On a product whose whole pitch is an evidence trail,
 *   manufacturing false evidence is the worst possible failure mode — much
 *   worse than a visible error.
 *
 *   Every function here now returns a DeliveryResult describing what actually
 *   happened per channel. Callers must look at it before claiming success.
 *   `anyDelivered()` is the check; `describeDelivery()` turns the result into
 *   something you can show a user.
 *
 * WHAT IT STILL DOES NOT DO
 *   A Resend/Twilio "accepted" is not proof of delivery to a human — it means
 *   the provider took the message. Bounces and carrier rejections arrive later
 *   by webhook, which is not built. So `sent` here means "handed to the
 *   provider and acknowledged", and nothing stronger should be claimed from it.
 */

/** Outcome for one channel. */
export type ChannelOutcome =
  /** Handed to the provider and acknowledged. */
  | { status: 'sent'; id?: string }
  /** No address/number for this customer — not an error, just nothing to do. */
  | { status: 'skipped'; reason: string }
  /** The channel is not configured on this deployment. */
  | { status: 'unconfigured'; reason: string }
  /** The provider rejected it. */
  | { status: 'failed'; reason: string }
  /** This month's SMS allowance is used up. Email is unaffected. */
  | { status: 'quota_exceeded'; reason: string }

export interface DeliveryResult {
  sms: ChannelOutcome
  email: ChannelOutcome
}

/** True when at least one channel actually reached a provider. */
export function anyDelivered(result: DeliveryResult): boolean {
  return result.sms.status === 'sent' || result.email.status === 'sent'
}

/** A sentence describing what happened, for the user or an error response. */
export function describeDelivery(result: DeliveryResult): string {
  const sent: string[] = []
  const problems: string[] = []

  for (const [channel, outcome] of [['SMS', result.sms], ['Email', result.email]] as const) {
    if (outcome.status === 'sent') sent.push(channel)
    else if (outcome.status === 'unconfigured') problems.push(`${channel} is not configured on this server`)
    else if (outcome.status === 'failed') problems.push(`${channel} failed: ${outcome.reason}`)
    // Not a failure and not a fault: a known limit, reached. Worded so the
    // business knows the customer still heard from them.
    else if (outcome.status === 'quota_exceeded') problems.push(outcome.reason)
  }

  if (sent.length && !problems.length) return `Sent by ${sent.join(' and ')}.`
  if (sent.length) return `Sent by ${sent.join(' and ')}, but ${problems.join('; ')}.`
  if (problems.length) return problems.join('; ')
  return 'Nothing was sent: this customer has no phone number or email address on file.'
}

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return null
  return twilio(accountSid, authToken)
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

/** Shared sender so the two public functions cannot drift apart. */
async function deliver({
  tenantId,
  businessName,
  customerPhone,
  customerEmail,
  subject,
  text,
  html,
}: {
  /**
   * Required. SMS is metered per tenant per month (lib/sms-quota.ts), and
   * this is the single place a text can be sent from — so the allowance is
   * enforced here and cannot be routed around by adding another caller.
   */
  tenantId: string
  businessName: string
  customerPhone: string | null | undefined
  customerEmail: string | null | undefined
  subject: string
  text: string
  html: string
}): Promise<DeliveryResult> {
  const sms = (async (): Promise<ChannelOutcome> => {
    if (!customerPhone) return { status: 'skipped', reason: 'no phone number on file' }
    const from = process.env.TWILIO_PHONE_NUMBER
    const client = getTwilioClient()
    if (!client || !from) {
      return { status: 'unconfigured', reason: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_PHONE_NUMBER is not set' }
    }

    // Check the allowance BEFORE calling Twilio. Checking afterwards would
    // mean paying for the message we are about to refuse.
    const quota = await getSmsQuota(tenantId)
    if (quota.exhausted) {
      await recordSmsAttempt(tenantId, 'blocked')
      return { status: 'quota_exceeded', reason: exhaustedMessage(quota) }
    }

    try {
      const msg = await client.messages.create({ to: customerPhone, from, body: text })
      // Counted only on success: a message Twilio rejected costs nothing and
      // must not eat somebody's allowance.
      await recordSmsAttempt(tenantId, 'sent')
      return { status: 'sent', id: msg.sid }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      console.error('Twilio SMS failed:', err)
      return { status: 'failed', reason }
    }
  })()

  const email = (async (): Promise<ChannelOutcome> => {
    if (!customerEmail) return { status: 'skipped', reason: 'no email address on file' }
    const client = getResendClient()
    if (!client) return { status: 'unconfigured', reason: 'RESEND_API_KEY is not set' }

    const configured = process.env.RESEND_FROM_EMAIL ?? 'notifications@fieldms.app'
    const address = configured.includes('<') ? configured.split('<')[1].replace('>', '') : configured
    try {
      const res = await client.emails.send({
        from: `${businessName} <${address}>`,
        to: customerEmail,
        subject,
        html,
      })
      // The Resend SDK reports rejections in the body rather than by throwing,
      // so a thrown error is not the only failure to check for.
      if (res.error) {
        console.error('Resend email rejected:', res.error)
        return { status: 'failed', reason: res.error.message }
      }
      return { status: 'sent', id: res.data?.id }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown error'
      console.error('Resend email failed:', err)
      return { status: 'failed', reason }
    }
  })()

  const [smsOutcome, emailOutcome] = await Promise.all([sms, email])
  return { sms: smsOutcome, email: emailOutcome }
}

function buildMessage(eventType: JobEventType, rawTitle: string, trackingUrl: string | null, businessName: string) {
  // The plain-text versions use the title as typed; the HTML versions get an
  // escaped copy, because a job title is free text typed by staff.
  const jobTitle = rawTitle
  const safeTitle = escapeHtml(rawTitle)
  const safeBusiness = escapeHtml(businessName)
  switch (eventType) {
    case 'travel_started':
      return {
        subject: 'Your technician is on the way',
        text: trackingUrl
          ? `Your technician is heading to you for "${jobTitle}". Track their live location here: ${trackingUrl}`
          : `Your technician is heading to you for "${jobTitle}".`,
        html: trackingUrl
          ? `<p>Your technician from ${safeBusiness} is heading to you for <strong>${safeTitle}</strong>.</p><p><a href="${trackingUrl}">Track their live location →</a></p>`
          : `<p>Your technician from ${safeBusiness} is heading to you for <strong>${safeTitle}</strong>.</p>`,
      }
    case 'job_started':
      return {
        subject: 'Your technician has arrived',
        text: `Your technician has arrived and is working on "${jobTitle}".`,
        html: `<p>Your technician has arrived and is working on <strong>${safeTitle}</strong>.</p>`,
      }
    case 'job_completed':
      return {
        subject: 'Your job is complete',
        // Previously said "Thank you for choosing FieldMS" — the customer chose
        // the business, not the software, and nothing customer-facing should
        // carry our name.
        text: `Your job "${jobTitle}" has been completed. Thank you for choosing ${businessName}.`,
        html: `<p>Your job <strong>${safeTitle}</strong> has been completed. Thank you for choosing ${safeBusiness}.</p>`,
      }
  }
}

/**
 * Generic customer message (SMS + email). Branded with the business name:
 * customer-facing comms never mention FieldMS.
 *
 * Returns what actually happened. Check it before telling anyone it was sent.
 */
export async function sendCustomerLink(args: {
  tenantId: string
  businessName: string
  customerPhone: string | null | undefined
  customerEmail: string | null | undefined
  subject: string
  text: string
  html: string
}): Promise<DeliveryResult> {
  return deliver(args)
}

/** Job lifecycle notification. Same contract: check the result. */
export async function notifyCustomer({
  tenantId,
  eventType,
  jobTitle,
  businessName,
  customerPhone,
  customerEmail,
  trackingUrl,
}: {
  tenantId: string
  eventType: JobEventType
  jobTitle: string
  businessName: string
  customerPhone: string | null | undefined
  customerEmail: string | null | undefined
  trackingUrl: string | null
}): Promise<DeliveryResult> {
  const message = buildMessage(eventType, jobTitle, trackingUrl, businessName)
  return deliver({
    tenantId,
    businessName,
    customerPhone,
    customerEmail,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
}
