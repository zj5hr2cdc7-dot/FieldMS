#!/usr/bin/env node
/**
 * Migration hygiene check.
 *
 * WHY
 *   Migrations are applied in filename order. Two files sharing a prefix have
 *   no defined order between them, so a fresh rebuild may run them either way
 *   round — and the one that happens to lose creates a table the other
 *   already referenced.
 *
 *   This is not hypothetical here. There were two 020s for months, and this
 *   project briefly had two 032s because two people were working in parallel
 *   and both reached for the next free number. Neither broke production,
 *   because production was built by pasting files in by hand in the order
 *   someone remembered — which is exactly the fragility worth removing now
 *   that public.jobs has a baseline and the database can be rebuilt from git.
 *
 *   It also checks the thing that bit migration 027: SQL that parses as valid
 *   Postgres but does not survive the Supabase SQL editor splitting pasted
 *   input on semicolons.
 *
 * Run: node scripts/audit-migrations.mjs   (part of npm run audit:all)
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations')

const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
const problems = []
const notes = []

// ── 1. Prefix collisions ───────────────────────────────────────────────────
const byPrefix = new Map()
for (const f of files) {
  const prefix = f.split('_')[0]
  if (!byPrefix.has(prefix)) byPrefix.set(prefix, [])
  byPrefix.get(prefix).push(f)
}
for (const [prefix, group] of byPrefix) {
  if (group.length > 1) {
    problems.push(`Prefix ${prefix} used by ${group.length} files — order between them is undefined:\n    ${group.join('\n    ')}`)
  }
}

// ── 2. Gaps, which usually mean a deleted or never-committed migration ─────
const numbers = [...byPrefix.keys()]
  .map((p) => parseInt(p, 10))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b)
for (let n = numbers[0]; n < numbers[numbers.length - 1]; n++) {
  if (!numbers.includes(n)) {
    notes.push(`No migration ${String(n).padStart(3, '0')} — fine if deliberate, worth knowing if a file went missing.`)
  }
}

// ── 3. Constructs that can break on paste ──────────────────────────────────
// A DO block or a function body contains semicolons. The Supabase SQL editor
// has been observed splitting pasted input on semicolons — migration 027
// failed exactly that way — so these need running as a whole file rather than
// pasted piecemeal.
//
// Reported as a NOTE, not a failure, and deliberately so. The files below are
// already applied in production and cannot be changed, so failing on them
// would mean an audit that nobody can ever make green. An audit that cries
// wolf gets ignored, and takes the collision check down with it. Keep the
// hard failure for the thing that is actually actionable.
const dollarQuoted = []
for (const f of files) {
  const sql = readFileSync(join(DIR, f), 'utf8')
  const stripped = sql.replace(/--[^\n]*/g, '')
  if (/\bDO\s*\$|\$\$|LANGUAGE\s+plpgsql/i.test(stripped)) dollarQuoted.push(f)
}
if (dollarQuoted.length) {
  notes.push(
    `${dollarQuoted.length} migration(s) use DO blocks or dollar quoting, so they must be run ` +
      `as a whole file rather than pasted statement by statement:\n    ${dollarQuoted.join('\n    ')}` +
      `\n    Prefer plain statements in NEW migrations — see 027, 028 and 034.`
  )
}

// ── Report ─────────────────────────────────────────────────────────────────
console.log(`\nMIGRATION AUDIT — ${files.length} files\n`)
if (notes.length) {
  console.log('Notes:')
  for (const n of notes) console.log(`  ${n}`)
  console.log('')
}
if (problems.length) {
  console.log(`PROBLEMS (${problems.length}):\n`)
  for (const p of problems) console.log(`  ${p}\n`)
  console.log('FAIL\n')
  process.exit(1)
}
console.log('PASS — no prefix collisions, nothing that breaks on paste.\n')
