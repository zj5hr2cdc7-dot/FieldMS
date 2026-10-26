/**
 * Server-only: the daily reminder run.
 *
 *   Quotes    sent but not approved or declined: a nudge at 3 and 7 days.
 *   Invoices  past due and still owing: reminders at 7, 14 and 30 days
 *             overdue, and the invoice is marked 'overdue'.
 *   Testing   a weekly email (Mondays) to the workspace owners listing
 *             assets whose test is overdue or due in the next 30 days.
 *
 * Customer-facing reminders only go out for workspaces that turned them on.
 * Emails carry the business's name, never FieldMS, and replies go to the
 * owner. reminder_log's unique key means a reminder is sent at most once.
 */
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { SITE_URL } from '@/lib/seo'

type Admin = ReturnType<typeof createAdminClient>

const QUOTE_STEPS = [3, 7]
const INVOICE_STEPS = [7, 14, 30]
const DAY = 86_400_000

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const money = (n: number) => `$${n.toFixed(2)}`
const auDate = (d: string | Date) => new Date(d).toLocaleDateString('en-AU', { timeZone: 'Australia/Brisbane' })

export interface ReminderRunResult {
  quotes: number
  invoices: number
  digests: number
  markedOverdue: number
  skipped: string[]
}

function sender() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  const resend = new Resend(key)
  const raw = process.env.RESEND_FROM_EMAIL ?? 'notifications@fieldms.app'
  const address = raw.includes('<') ? raw.split('<')[1].replace('>', '') : raw
  return async (opts: { fromName: string; to: string; replyTo?: string | null; subject: string; html: string; text: string }) => {
    const { error } = await resend.emails.send({
      from: `${opts.fromName} <${address}>`,
      to: opts.to,
      replyTo: opts.replyTo ?? undefined,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    if (error) throw new Error(error.message)
  }
}

/** Claim a reminder slot. False if it was already sent. */
async function claim(admin: Admin, row: { tenant_id: string; kind: string; entity_id: string; step: number; sent_to: string }) {
  const { error } = await admin.from('reminder_log').insert(row)
  if (!error) return true
  if (error.code === '23505') return false
  throw error
}

async function release(admin: Admin, kind: string, entityId: string, step: number) {
  await admin.from('reminder_log').delete().eq('kind', kind).eq('entity_id', entityId).eq('step', step)
}

async function ownerContacts(admin: Admin, tenantIds: string[]) {
  const { data: owners } = await admin
    .from('tenant_members')
    .select('tenant_id, user_id')
    .in('tenant_id', tenantIds)
    .eq('role', 'owner')
  const userIds = [...new Set((owners ?? []).map((o) => o.user_id))]
  const { data: profiles } = userIds.length
    ? await admin.from('profiles').select('id, email').in('id', userIds)
    : { data: [] as { id: string; email: string | null }[] }
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]))
  const byTenant = new Map<string, string[]>()
  for (const o of owners ?? []) {
    const email = emailById.get(o.user_id)
    if (!email) continue
    byTenant.set(o.tenant_id, [...(byTenant.get(o.tenant_id) ?? []), email])
  }
  return byTenant
}

export async function runReminders(now = new Date()): Promise<ReminderRunResult> {
  const result: ReminderRunResult = { quotes: 0, invoices: 0, digests: 0, markedOverdue: 0, skipped: [] }
  const send = sender()
  if (!send) {
    result.skipped.push('RESEND_API_KEY not set: no emails sent')
  }
  const admin = createAdminClient()
  const today = now.toISOString().slice(0, 10)

  // Mark invoices overdue regardless of email settings: it is just the truth.
  const { data: overdueNow } = await admin
    .from('job_invoices')
    .update({ status: 'overdue' })
    .in('status', ['sent', 'viewed', 'part_paid'])
    .lt('due_date', today)
    .select('id')
  result.markedOverdue = overdueNow?.length ?? 0

  if (!send) return result

  const { data: settingsRows } = await admin.from('tenant_reminder_settings').select('*')
  const settings = new Map((settingsRows ?? []).map((s) => [s.tenant_id, s]))
  const quoteTenants = [...settings.values()].filter((s) => s.quote_reminders).map((s) => s.tenant_id)
  const invoiceTenants = [...settings.values()].filter((s) => s.invoice_reminders).map((s) => s.tenant_id)

  const allTenants = [...new Set([...quoteTenants, ...invoiceTenants])]
  const { data: tenants } = allTenants.length
    ? await admin.from('tenants').select('id, name, phone').in('id', allTenants)
    : { data: [] as { id: string; name: string; phone: string | null }[] }
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]))
  const owners = allTenants.length ? await ownerContacts(admin, allTenants) : new Map<string, string[]>()

  // ── Quotes ──
  if (quoteTenants.length) {
    const { data: quotes } = await admin
      .from('estimates')
      .select('id, business_id, customer_name, customer_email, total, public_token, sent_at, status, approved_at, declined_at')
      .in('business_id', quoteTenants)
      .in('status', ['sent', 'viewed'])
      .is('approved_at', null)
      .is('declined_at', null)
      .not('sent_at', 'is', null)
      .not('customer_email', 'is', null)
    for (const q of quotes ?? []) {
      const age = Math.floor((now.getTime() - new Date(q.sent_at).getTime()) / DAY)
      const step = [...QUOTE_STEPS].reverse().find((d) => age >= d)
      if (!step || !q.public_token) continue
      const tenant = tenantById.get(q.business_id)
      if (!tenant) continue
      if (!(await claim(admin, { tenant_id: q.business_id, kind: 'quote', entity_id: q.id, step, sent_to: q.customer_email }))) continue
      const link = `${SITE_URL}/quote/${q.public_token}`
      const hi = q.customer_name ? `Hi ${q.customer_name.split(' ')[0]},` : 'Hi,'
      try {
        await send({
          fromName: tenant.name,
          to: q.customer_email,
          replyTo: owners.get(q.business_id)?.[0],
          subject: `Your quote from ${tenant.name}`,
          text: `${hi}\n\nJust following up on the quote we sent on ${auDate(q.sent_at)}. You can view and approve it here:\n${link}\n\nAny questions, just reply to this email${tenant.phone ? ` or call ${tenant.phone}` : ''}.\n\n${tenant.name}`,
          html: `<p>${esc(hi)}</p><p>Just following up on the quote we sent on ${auDate(q.sent_at)}.</p><p><a href="${link}">View and approve your quote</a></p><p>Any questions, just reply to this email${tenant.phone ? ` or call ${esc(tenant.phone)}` : ''}.</p><p>${esc(tenant.name)}</p>`,
        })
        result.quotes++
      } catch (err) {
        console.error('Quote reminder failed', q.id, err)
        await release(admin, 'quote', q.id, step)
      }
    }
  }

  // ── Invoices ──
  if (invoiceTenants.length) {
    const { data: invoices } = await admin
      .from('job_invoices')
      .select('id, tenant_id, job_id, invoice_number, total_inc_gst, amount_paid, due_date, public_token, status')
      .in('tenant_id', invoiceTenants)
      .eq('status', 'overdue')
      .not('due_date', 'is', null)
    const jobIds = [...new Set((invoices ?? []).map((i) => i.job_id))]
    const { data: jobs } = jobIds.length
      ? await admin.from('jobs').select('id, customer_name, customer_email, customer_id').in('id', jobIds)
      : { data: [] as { id: string; customer_name: string | null; customer_email: string | null; customer_id: string | null }[] }
    const customerIds = [...new Set((jobs ?? []).map((j) => j.customer_id).filter(Boolean))] as string[]
    const { data: customers } = customerIds.length
      ? await admin.from('customers').select('id, email').in('id', customerIds)
      : { data: [] as { id: string; email: string | null }[] }
    const customerEmail = new Map((customers ?? []).map((c) => [c.id, c.email]))
    const jobById = new Map((jobs ?? []).map((j) => [j.id, j]))

    for (const inv of invoices ?? []) {
      const owing = Number(inv.total_inc_gst) - Number(inv.amount_paid)
      if (owing < 0.5 || !inv.public_token) continue
      const daysOverdue = Math.floor((now.getTime() - new Date(`${inv.due_date}T00:00:00+10:00`).getTime()) / DAY)
      const step = [...INVOICE_STEPS].reverse().find((d) => daysOverdue >= d)
      if (!step) continue
      const job = jobById.get(inv.job_id)
      const to = job?.customer_email || (job?.customer_id ? customerEmail.get(job.customer_id) : null)
      const tenant = tenantById.get(inv.tenant_id)
      if (!to || !tenant) continue
      if (!(await claim(admin, { tenant_id: inv.tenant_id, kind: 'invoice', entity_id: inv.id, step, sent_to: to }))) continue
      const link = `${SITE_URL}/invoice/${inv.public_token}`
      const hi = job?.customer_name ? `Hi ${job.customer_name.split(' ')[0]},` : 'Hi,'
      const num = inv.invoice_number ?? ''
      try {
        await send({
          fromName: tenant.name,
          to,
          replyTo: owners.get(inv.tenant_id)?.[0],
          subject: `Reminder: invoice ${num} from ${tenant.name}`.replace('  ', ' '),
          text: `${hi}\n\nA friendly reminder that invoice ${num} for ${money(owing)} was due on ${auDate(inv.due_date)}. You can view or pay it here:\n${link}\n\nIf you've already paid, thank you, and please ignore this email.\n\n${tenant.name}`,
          html: `<p>${esc(hi)}</p><p>A friendly reminder that invoice ${esc(num)} for <strong>${money(owing)}</strong> was due on ${auDate(inv.due_date)}.</p><p><a href="${link}">View or pay the invoice</a></p><p>If you've already paid, thank you, and please ignore this email.</p><p>${esc(tenant.name)}</p>`,
        })
        result.invoices++
      } catch (err) {
        console.error('Invoice reminder failed', inv.id, err)
        await release(admin, 'invoice', inv.id, step)
      }
    }
  }

  // ── Weekly testing-due digest to owners (Mondays, Brisbane time) ──
  const brisbaneDay = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' })).getDay()
  if (brisbaneDay === 1) {
    const horizon = new Date(now.getTime() + 30 * DAY).toISOString().slice(0, 10)
    const { data: due } = await admin
      .from('assets')
      .select('id, tenant_id, label, next_test_due, customer_id')
      .eq('status', 'active')
      .not('next_test_due', 'is', null)
      .lte('next_test_due', horizon)
      .order('next_test_due')
    const custIds = [...new Set((due ?? []).map((a) => a.customer_id).filter(Boolean))] as string[]
    const { data: custs } = custIds.length
      ? await admin.from('customers').select('id, name').in('id', custIds)
      : { data: [] as { id: string; name: string }[] }
    const custName = new Map((custs ?? []).map((c) => [c.id, c.name]))
    const byTenant = new Map<string, { label: string; next_test_due: string; customer: string | null }[]>()
    for (const a of due ?? []) {
      const s = settings.get(a.tenant_id)
      if (s && s.testing_digest === false) continue
      const customer = a.customer_id ? custName.get(a.customer_id) ?? null : null
      byTenant.set(a.tenant_id, [...(byTenant.get(a.tenant_id) ?? []), { label: a.label, next_test_due: a.next_test_due, customer }])
    }
    if (byTenant.size) {
      const ids = [...byTenant.keys()]
      const contacts = await ownerContacts(admin, ids)
      const week = Math.floor(now.getTime() / (7 * DAY))
      for (const [tenantId, assets] of byTenant) {
        const to = contacts.get(tenantId)
        if (!to?.length) continue
        if (!(await claim(admin, { tenant_id: tenantId, kind: 'testing_digest', entity_id: tenantId, step: week, sent_to: to.join(',') }))) continue
        const overdue = assets.filter((a) => a.next_test_due < today)
        const lines = assets.map(
          (a) => `${a.customer ? `${a.customer}, ` : ''}${a.label}: ${a.next_test_due < today ? 'OVERDUE since' : 'due'} ${auDate(a.next_test_due)}`
        )
        try {
          await send({
            fromName: 'FieldMS',
            to: to[0],
            subject: `${assets.length} test${assets.length === 1 ? '' : 's'} due in the next 30 days${overdue.length ? ` (${overdue.length} overdue)` : ''}`,
            text: `Testing due for your customers' assets:\n\n${lines.join('\n')}\n\nThis is repeat work: contact these customers to book it in.\n${SITE_URL}/dashboard/compliance`,
            html: `<p>Testing due for your customers' assets:</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p>This is repeat work: contact these customers to book it in.</p><p><a href="${SITE_URL}/dashboard/compliance">Open the compliance register</a></p>`,
          })
          result.digests++
        } catch (err) {
          console.error('Testing digest failed', tenantId, err)
          await release(admin, 'testing_digest', tenantId, week)
        }
      }
    }
  }

  return result
}
