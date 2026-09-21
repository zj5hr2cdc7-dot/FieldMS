#!/usr/bin/env node
/**
 * Static tenant-isolation audit of supabase/migrations.
 *
 * WHAT THIS IS AND IS NOT
 *   This reads the migration files and reports, for every table: whether RLS
 *   is enabled, which commands have policies, and whether the table carries a
 *   tenant_id (or reaches one through a foreign key).
 *
 *   It is a static reading of the intended schema. It cannot tell you what is
 *   actually live in the database — a migration that was never applied, or a
 *   policy someone dropped in the SQL editor, looks identical from here. Use
 *   VERIFY_SCHEMA.sql against the real database for that. Both are needed:
 *   this one catches "we never wrote the policy", that one catches "the policy
 *   is not there".
 *
 *   A table can also be deliberately tenant-less (reference data, or a table
 *   scoped by user_id instead). Those are listed in EXPECTED_NO_TENANT below
 *   with the reason, so that the report shows real gaps rather than noise.
 *
 * Exit code 1 if any table has RLS off, or RLS on with no policy at all.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS = join(ROOT, 'supabase', 'migrations')

/** Tables that legitimately have no tenant_id, and why. */
const EXPECTED_NO_TENANT = {
  tenants: 'is the tenant',
  tenant_members: 'maps user -> tenant; scoped by user_id',
  profiles: 'one row per auth user; scoped by user_id',
}

const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => ({ file: f, text: readFileSync(join(MIGRATIONS, f), 'utf8') }))

/** Strip comments so commented-out DDL is not counted as real. */
function strip(text) {
  return text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

const tables = new Map()

function table(name) {
  if (!tables.has(name)) {
    tables.set(name, {
      name,
      created: null,
      columns: new Set(),
      rlsEnabled: false,
      policies: { SELECT: [], INSERT: [], UPDATE: [], DELETE: [], ALL: [] },
      fks: new Set(),
    })
  }
  return tables.get(name)
}

for (const { file, text } of sql) {
  const body = strip(text)

  // CREATE TABLE [IF NOT EXISTS] [public.]name ( ... )
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\n\s*\);/gi
  let m
  while ((m = createRe.exec(body))) {
    const t = table(m[1])
    t.created = t.created ?? file
    for (const line of m[2].split('\n')) {
      const col = line.trim().match(/^([a-z_][a-z0-9_]*)\s+/i)
      if (col && !/^(primary|foreign|unique|check|constraint)$/i.test(col[1])) {
        t.columns.add(col[1].toLowerCase())
      }
      const ref = line.match(/REFERENCES\s+(?:public\.)?([a-z_][a-z0-9_]*)/i)
      if (ref) t.fks.add(ref[1].toLowerCase())
    }
  }

  // ALTER TABLE ... ADD COLUMN
  const addColRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)[\s\S]*?ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z_][a-z0-9_]*)/gi
  while ((m = addColRe.exec(body))) table(m[1]).columns.add(m[2].toLowerCase())

  // ENABLE ROW LEVEL SECURITY
  const rlsRe = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
  while ((m = rlsRe.exec(body))) table(m[1]).rlsEnabled = true

  /*
   * CREATE POLICY <name> ON <table> [FOR <cmd>] ...
   *
   * The name is either a quoted identifier that CONTAINS SPACES ("Users can
   * view estimates for their business") or a bare identifier. An earlier
   * version of this matched the name as [^"\s]+, which stopped at the first
   * space inside the quotes and then failed to find ON — so it reported zero
   * policies for all 49 tables and 32 false CRITICALs. The statements also
   * span multiple lines, so everything here is newline-tolerant.
   *
   * If this parser ever reports zero policies again, suspect the parser
   * before you suspect the schema: `grep -c "CREATE POLICY"` is the check.
   */
  const polRe = /CREATE\s+POLICY\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)([\s\S]*?)(?=;|\bCREATE\s+POLICY\b)/gi
  while ((m = polRe.exec(body))) {
    const name = m[1] ?? m[2]
    const t = table(m[3])
    const forClause = m[4].match(/\bFOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\b/i)
    // No FOR clause means the policy applies to ALL commands.
    t.policies[forClause ? forClause[1].toUpperCase() : 'ALL'].push(name)
    // Record how the policy scopes rows, so we can tell a real tenant check
    // from a policy that just says USING (true).
    if (/\btenant_members\b/i.test(m[4])) t.scopedViaMembership = true
    if (/USING\s*\(\s*true\s*\)/i.test(m[4])) t.hasPermissivePolicy = true
    if (/auth\.uid\(\)/i.test(m[4])) t.usesAuthUid = true
  }
}

// Storage policies live on storage.objects and are audited separately.
tables.delete('objects')

/*
 * Parser self-check. The failure mode of this script is silent: a regex that
 * matches nothing reports a perfectly clean-looking table of zeros and a pile
 * of false criticals, which is exactly what happened the first time it ran.
 * Compare what we parsed against a dumb textual count and refuse to report if
 * they disagree materially.
 */
const textualPolicyCount = sql.reduce((n, { text }) => {
  // Storage policies are built dynamically inside EXECUTE format(...) with a
  // %I placeholder for the name, and they target storage.objects rather than a
  // public table. They are real, but they are not this script's subject —
  // migration 026 is reviewed by hand in AUDIT_REPORT.md. Exclude them so the
  // self-check compares like with like.
  const all = (strip(text).match(/CREATE\s+POLICY[\s\S]{0,80}/gi) ?? [])
  return n + all.filter((s) => !/storage\.objects/i.test(s)).length
}, 0)
const parsedPolicyCount = [...tables.values()].reduce(
  (n, t) => n + Object.values(t.policies).flat().length,
  0
)
if (parsedPolicyCount < textualPolicyCount) {
  console.error(
    `\nPARSER ERROR: found ${textualPolicyCount} CREATE POLICY statements in the ` +
      `migrations but only parsed ${parsedPolicyCount}. The report would be wrong. ` +
      `Fix the parser in ${import.meta.url.split('/').pop()} before trusting any output.\n`
  )
  process.exit(2)
}

const rows = [...tables.values()].filter((t) => t.created)
const findings = []

for (const t of rows) {
  const hasTenant = t.columns.has('tenant_id')
  const reachesTenant = [...t.fks].some((f) => tables.get(f)?.columns.has('tenant_id'))
  const expected = EXPECTED_NO_TENANT[t.name]
  const counts = Object.fromEntries(
    Object.entries(t.policies).map(([k, v]) => [k, v.length])
  )
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  if (!t.rlsEnabled) {
    findings.push({ sev: 'CRITICAL', table: t.name, issue: 'RLS not enabled — every row readable by any authenticated user' })
  } else if (total === 0) {
    findings.push({ sev: 'CRITICAL', table: t.name, issue: 'RLS enabled but zero policies — table is unreachable AND unprotected if RLS is ever disabled' })
  } else {
    // Missing per-command policies: with RLS on, no policy = denied, which is
    // safe but usually means a feature silently fails rather than a hole.
    const covered = counts.ALL > 0
    for (const cmd of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      if (!covered && counts[cmd] === 0) {
        findings.push({ sev: 'INFO', table: t.name, issue: `no ${cmd} policy (denied by default — intentional?)` })
      }
    }
  }

  if (!hasTenant && !expected) {
    findings.push({
      sev: reachesTenant ? 'MEDIUM' : 'HIGH',
      table: t.name,
      issue: reachesTenant
        ? 'no tenant_id column; isolation depends on a join through a foreign key — verify each policy actually performs that join'
        : 'no tenant_id column and no FK to a tenant-scoped table — isolation basis unclear',
    })
  }
}

// ── Report ──────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n)
console.log(`\nTENANT ISOLATION AUDIT — ${rows.length} tables across ${sql.length} migrations\n`)
console.log(pad('TABLE', 28), pad('RLS', 5), pad('SEL', 4), pad('INS', 4), pad('UPD', 4), pad('DEL', 4), pad('ALL', 4), 'TENANT')
console.log('-'.repeat(78))
for (const t of rows.sort((a, b) => a.name.localeCompare(b.name))) {
  const c = t.policies
  const tenant = t.columns.has('tenant_id')
    ? 'tenant_id'
    : EXPECTED_NO_TENANT[t.name]
      ? 'n/a'
      : [...t.fks].some((f) => tables.get(f)?.columns.has('tenant_id'))
        ? 'via FK'
        : '** NONE **'
  console.log(
    pad(t.name, 28),
    pad(t.rlsEnabled ? 'on' : 'OFF', 5),
    pad(c.SELECT.length, 4), pad(c.INSERT.length, 4),
    pad(c.UPDATE.length, 4), pad(c.DELETE.length, 4), pad(c.ALL.length, 4),
    tenant
  )
}

const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 }
const real = findings.filter((f) => f.sev !== 'INFO')
console.log(`\n\nFINDINGS (${real.length} actionable, ${findings.length - real.length} informational)\n`)
for (const f of findings.sort((a, b) => order[a.sev] - order[b.sev])) {
  console.log(`  [${pad(f.sev, 8)}] ${pad(f.table, 26)} ${f.issue}`)
}

const blocking = findings.filter((f) => f.sev === 'CRITICAL')
console.log(`\n${blocking.length ? `FAIL — ${blocking.length} critical` : 'PASS — no critical findings'}\n`)
process.exit(blocking.length ? 1 : 0)
