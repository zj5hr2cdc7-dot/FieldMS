import twilio from 'twilio'
import { Resend } from 'resend'
import type { JobEventType } from '@/types/database'

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

function buildMessage(eventType: JobEventType, jobTitle: string, trackingUrl: string | null) {
  switch (eventType) {
    case 'travel_started':
      return {
        subject: 'Your technician is on the way',
        text: trackingUrl
          ? `Your technician is heading to you for "${jobTitle}". Track their live location here: ${trackingUrl}`
          : `Your technician is heading to you for "${jobTitle}".`,
        html: trackingUrl
          ? `<p>Your technician is heading to you for <strong>${jobTitle}</strong>.</p><p><a href="${trackingUrl}">Track their live location →</a></p>`
          : `<p>Your technician is heading to you for <strong>${jobTitle}</strong>.</p>`,
      }
    case 'job_started':
      return {
        subject: 'Your technician has arrived',
        text: `Your technician has arrived and is working on "${jobTitle}".`,
        html: `<p>Your technician has arrived and is working on <strong>${jobTitle}</strong>.</p>`,
      }
    case 'job_completed':
      return {
        subject: 'Your job is complete',
        text: `Your job "${jobTitle}" has been completed. Thank you for choosing FieldMS.`,
        html: `<p>Your job <strong>${jobTitle}</strong> has been completed. Thank you for choosing FieldMS.</p>`,
      }
  }
}

/**
 * Generic customer message (SMS + email). Branded with the business name —
 * customer-facing comms never mention FieldMS (Tradify's "sent from Tradify"
 * footer is a years-old complaint).
 */
export async function sendCustomerLink({
  businessName,
  customerPhone,
  customerEmail,
  subject,
  text,
  html,
}: {
  businessName: string
  customerPhone: string | null | undefined
  customerEmail: string | null | undefined
  subject: string
  text: string
  html: string
}) {
  const smsPromise = (async () => {
    if (!customerPhone) return
    const from = process.env.TWILIO_PHONE_NUMBER
    const client = getTwilioClient()
    if (!client || !from) return
    try {
      await client.messages.create({ to: customerPhone, from, body: text })
    } catch (err) {
      console.error('Twilio SMS failed:', err)
    }
  })()

  const emailPromise = (async () => {
    if (!customerEmail) return
    const from = process.env.RESEND_FROM_EMAIL ?? 'notifications@fieldms.app'
    const client = getResendClient()
    if (!client) return
    try {
      await client.emails.send({ from: `${businessName} <${from.includes('<') ? from.split('<')[1].replace('>', '') : from}>`, to: customerEmail, subject, html })
    } catch (err) {
      console.error('Resend email failed:', err)
    }
  })()

  await Promise.allSettled([smsPromise, emailPromise])
}

export async function notifyCustomer({
  eventType,
  jobTitle,
  customerPhone,
  customerEmail,
  trackingUrl,
}: {
  eventType: JobEventType
  jobTitle: string
  customerPhone: string | null | undefined
  customerEmail: string | null | undefined
  trackingUrl: string | null
}) {
  const message = buildMessage(eventType, jobTitle, trackingUrl)

  const smsPromise = (async () => {
    if (!customerPhone) return
    const from = process.env.TWILIO_PHONE_NUMBER
    const client = getTwilioClient()
    if (!client || !from) return
    try {
      await client.messages.create({ to: customerPhone, from, body: message.text })
    } catch (err) {
      console.error('Twilio SMS failed:', err)
    }
  })()

  const emailPromise = (async () => {
    if (!customerEmail) return
    const from = process.env.RESEND_FROM_EMAIL ?? 'notifications@fieldms.app'
    const client = getResendClient()
    if (!client) return
    try {
      await client.emails.send({
        from,
        to: customerEmail,
        subject: message.subject,
        html: message.html,
      })
    } catch (err) {
      console.error('Resend email failed:', err)
    }
  })()

  await Promise.allSettled([smsPromise, emailPromise])
}
