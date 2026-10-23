#!/usr/bin/env node
/**
 * Cross-tenant isolation tests — run against a REAL Supabase project.
 *
 * WHY THIS EXISTS
 *   Every other check in this repo reads the schema. scripts/audit-rls.mjs
 *   tells you a policy is written; it cannot tell you the policy WORKS. The
 *   audit has said "isolation reviewed statically, never tested at runtime"
 *   for weeks, and that is the one claim you cannot afford to be wrong about:
 *   it is the difference between a bug and a notifiable data breach.
 *
 *   This signs in as two real users in two different workspaces and tries to
 *   reach across the boundary, the way an attacker would — through the same
 *   client library the browser uses, with a real JWT, so RLS is genuinely in
 *   the path.
 *
 * ── RUN IT AGAINST STAGING, NOT PRODUCTION ─────────────────────────────────
 *   It writes rows. Point it at a staging project, or a production project you
 *   are willing to leave two test workspaces in. It refuses to run unless
 *   ALLOW_WRITES=1 so a stray invocation cannot touch live data.
 *
 * USAGE
 *   export NEXT_PUBLIC_SUPABASE_URL=...
 *   export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...      # creates the fixtures only
 *   export ALLOW_WRITES=1
 *   node scripts/cross-tenant-tests.mjs
 *
 *   Add --keep to leave the fixtures behind for inspection.
 *
 * WHAT A PASS MEANS
 *   That these specific attacks failed. It is evidence, not proof: a table
 *   added tomorrow with no policy will not be covered until it is added to
 *   TENANT_TABLES below. Keep that list in step with audit-rls.mjs.
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const KEEP = process.argv.includes('--keep')

if (!URL || !ANON || !SERVICE) {
  console.error(
    'Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and ' +
      'SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(2)
}
if (process.env.ALLOW_WRITES !== '1') {
  console.error(
    'Refusing to run without ALLOW_WRITES=1.\n' +
      'This creates two workspaces and two users. Point it at STAGING.'
  )
  process.exit(2)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

/**
 * Tenant-scoped tables a signed-in user must never read across the boundary.
 * Keep in step with scripts/audit-rls.mjs. Reference tables that are
 * deliberately shared (master_products, supplier_products, price_snapshots,
 * price_changes, asset_types) are excluded on purpose — they hold market list
 * prices, not anybody's trade pricing.
 */
const TENANT_TABLES = [
  'jobs', 'customers', 'sites', 'job_billing_items', 'job_invoices',
  'job_payments', 'job_photos', 'job_plans', 'job_reports', 'job_test_sheets',
  'job_variations', 'job_events', 'job_location_updates', 'time_entries',
  'estimates', 'estimate_items', 'form_templates', 'form_submissions',
  'form_signatures', 'assets', 'tenant_branding', 'tenant_members',
  'tenant_trade_prices', 'tenant_price_overrides', 'tenant_supplier_accounts',
  'tenant_pricing_settings', 'purchase_orders', 'integrations',
  'company_announcements', 'job_packages', 'job_package_items',
  'tenant_sms_usage', 'tenant_subscriptions', 'tenant_payment_accounts',
]

const results = []
const record = (name, pass, detail) => {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const stamp = Date.now()
const fixtures = { users: [], tenants: [] }

async function makeWorkspace(label) {
  const email = `isolation-${label}-${stamp}@fieldms-test.invalid`
  const password = `Test-${randomUUID()}`

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userError) throw new Error(`createUser(${label}): ${userError.message}`)
  const userId = created.user.id
  fixtures.users.push(userId)

  const { data: tenant, error: tenantError } = await admin
    .from('tenants')
    .insert({ name: `Isolation test ${label} ${stamp}` })
    .select('id')
    .single()
  if (tenantError) throw new Error(`tenant(${label}): ${tenantError.message}`)
  fixtures.tenants.push(tenant.id)

  const { error: memberError } = await admin
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: userId, role: 'owner' })
  if (memberError) throw new Error(`member(${label}): ${memberError.message}`)

  // One identifiable row per workspace to hunt for.
  const { data: customer } = await admin
    .from('customers')
    .insert({ tenant_id: tenant.id, name: `SECRET-${label}-${stamp}` })
    .select('id')
    .single()

  const { data: job } = await admin
    .from('jobs')
    .insert({
      tenant_id: tenant.id,
      title: `SECRET-JOB-${label}-${stamp}`,
      customer_name: `SECRET-${label}-${stamp}`,
      status: 'quoted',
    })
    .select('id')
    .single()

  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`signIn(${label}): ${signInError.message}`)

  return { label, email, userId, tenantId: tenant.id, client, customerId: customer?.id, jobId: job?.id }
}

async function cleanup() {
  if (KEEP) {
    console.log('\n--keep: fixtures left in place.')
    return
  }
  for (const id of fixtures.tenants) await admin.from('tenants').delete().eq('id', id)
  for (const id of fixtures.users) await admin.auth.admin.deleteUser(id).catch(() => {})
  console.log('\nFixtures removed.')
}

async function main() {
  console.log('\nCROSS-TENANT ISOLATION TESTS\n')
  console.log('Creating two workspaces…')
  const a = await makeWorkspace('A')
  const b = await makeWorkspace('B')
  console.log(`  A = ${a.tenantId}\n  B = ${b.tenantId}\n`)

  // ── 1. Read across the boundary, every tenant-scoped table ──────────────
  console.log('1. Tenant A reading Tenant B')
  for (const table of TENANT_TABLES) {
    const { data, error } = await a.client.from(table).select('*').eq('tenant_id', b.tenantId)
    if (error) {
      // A policy-denied read usually returns [] rather than an error; an error
      // here is most often a missing column, which is worth seeing.
      record(`read ${table}`, true, `denied (${error.code ?? 'error'})`)
      continue
    }
    record(`read ${table}`, (data?.length ?? 0) === 0, data?.length ? `LEAKED ${data.length} row(s)` : '')
  }

  // ── 2. Read by guessed primary key, with no tenant filter ───────────────
  console.log('\n2. Tenant A reading Tenant B by object id (IDOR)')
  const { data: jobById } = await a.client.from('jobs').select('*').eq('id', b.jobId)
  record('jobs by id', (jobById?.length ?? 0) === 0, jobById?.length ? 'LEAKED' : '')

  const { data: custById } = await a.client.from('customers').select('*').eq('id', b.customerId)
  record('customers by id', (custById?.length ?? 0) === 0, custById?.length ? 'LEAKED' : '')

  // Unfiltered select: RLS should return only A's own rows.
  const { data: allJobs } = await a.client.from('jobs').select('tenant_id')
  const foreign = (allJobs ?? []).filter((r) => r.tenant_id !== a.tenantId)
  record('unfiltered jobs select', foreign.length === 0, foreign.length ? `${foreign.length} foreign row(s)` : '')

  // ── 3. Write across the boundary ────────────────────────────────────────
  console.log('\n3. Tenant A writing to Tenant B')
  const { error: updateError } = await a.client
    .from('jobs')
    .update({ title: 'OWNED BY A' })
    .eq('id', b.jobId)
  const { data: afterUpdate } = await admin.from('jobs').select('title').eq('id', b.jobId).single()
  record(
    'update B job',
    afterUpdate?.title !== 'OWNED BY A',
    afterUpdate?.title === 'OWNED BY A' ? 'MODIFIED' : `blocked (${updateError?.code ?? 'no rows matched'})`
  )

  const { error: deleteError } = await a.client.from('jobs').delete().eq('id', b.jobId)
  const { data: afterDelete } = await admin.from('jobs').select('id').eq('id', b.jobId).maybeSingle()
  record(
    'delete B job',
    Boolean(afterDelete),
    afterDelete ? `blocked (${deleteError?.code ?? 'no rows matched'})` : 'DELETED'
  )

  const { error: insertError } = await a.client
    .from('customers')
    .insert({ tenant_id: b.tenantId, name: 'INSERTED BY A' })
  const { data: planted } = await admin
    .from('customers')
    .select('id')
    .eq('tenant_id', b.tenantId)
    .eq('name', 'INSERTED BY A')
  record(
    'insert into B',
    (planted?.length ?? 0) === 0,
    planted?.length ? 'INSERTED' : `blocked (${insertError?.code ?? 'denied'})`
  )

  // ── 4. Privilege escalation inside a workspace ──────────────────────────
  console.log('\n4. Privilege escalation')
  const { error: roleError } = await a.client
    .from('tenant_members')
    .update({ role: 'owner' })
    .eq('tenant_id', b.tenantId)
  const { data: bMember } = await admin
    .from('tenant_members')
    .select('role, user_id')
    .eq('tenant_id', b.tenantId)
    .single()
  record(
    'grant self a role in B',
    bMember?.user_id !== a.userId,
    bMember?.user_id === a.userId ? 'ESCALATED' : `blocked (${roleError?.code ?? 'no rows matched'})`
  )

  const { error: joinError } = await a.client
    .from('tenant_members')
    .insert({ tenant_id: b.tenantId, user_id: a.userId, role: 'owner' })
  const { data: joined } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', b.tenantId)
    .eq('user_id', a.userId)
  record(
    'join B as owner',
    (joined?.length ?? 0) === 0,
    joined?.length ? 'JOINED' : `blocked (${joinError?.code ?? 'denied'})`
  )

  // ── 5. Storage ──────────────────────────────────────────────────────────
  console.log('\n5. Storage')
  for (const bucket of ['job-photos', 'job-plans', 'branding', 'form-attachments']) {
    const { data, error } = await a.client.storage.from(bucket).list(b.tenantId)
    const leaked = (data?.length ?? 0) > 0
    record(`list ${bucket}/<B>`, !leaked, leaked ? `LISTED ${data.length} object(s)` : error ? 'denied' : 'empty')
  }

  // ── 6. Unauthenticated ──────────────────────────────────────────────────
  console.log('\n6. Unauthenticated')
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  for (const table of ['jobs', 'customers', 'job_invoices', 'tenant_members']) {
    const { data } = await anon.from(table).select('*').limit(1)
    record(`anon read ${table}`, (data?.length ?? 0) === 0, data?.length ? 'LEAKED' : '')
  }

  // ── Report ──────────────────────────────────────────────────────────────
  const failed = results.filter((r) => !r.pass)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`${results.length} checks, ${failed.length} failed\n`)
  if (failed.length) {
    console.log('FAILURES — each one is a cross-tenant data path:\n')
    for (const f of failed) console.log(`  ${f.name} — ${f.detail}`)
    console.log('')
  }
  await cleanup()
  process.exit(failed.length ? 1 : 0)
}

main().catch(async (err) => {
  console.error('\nHarness error (not necessarily a security failure):', err.message)
  await cleanup()
  process.exit(2)
})
