#!/usr/bin/env node
/**
 * FieldMS doctor — one command that checks everything before you ship.
 *
 *   npm run doctor
 *
 * WHY THIS EXISTS
 *   The repo's migrations did not match the live database: 004 and 006 to 021
 *   had never been applied, so two thirds of the tables the app queries did
 *   not exist. Nothing surfaced it, because a missing table makes a Supabase
 *   query return an error object that most pages swallow into an empty state.
 *   The app looked like it worked. It didn't.
 *
 *   Three separate classes of problem were invisible:
 *     1. Schema drift        tables and columns the code needs but the DB lacks
 *     2. Storage buckets     created only in commented out SQL, so never
 *     3. Environment         vars the code reads that were never set
 *
 *   This checks all three against reality rather than against assumptions.
 *   Every expectation is derived by scanning the codebase, so it stays honest
 *   as the app changes.
 *
 * EXIT CODES
 *   0  everything the app needs is present
 *   1  something is missing (details printed)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { scanSchemaUsage, dropStorageBuckets } from './lib/scan-schema.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const C = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m',
}
let failures = 0
let warnings = 0

const heading = (s) => console.log(`\n${C.bold}${s}${C.off}`)
const pass = (m) => console.log(`  ${C.green}ok${C.off}    ${m}`)
const fail = (m, hint) => {
  console.log(`  ${C.red}FAIL${C.off}  ${m}`)
  if (hint) console.log(`        ${C.dim}${hint}${C.off}`)
  failures++
}
const warn = (m, hint) => {
  console.log(`  ${C.yellow}warn${C.off}  ${m}`)
  if (hint) console.log(`        ${C.dim}${hint}${C.off}`)
  warnings++
}

// ── Load .env.local ─────────────────────────────────────────
const env = { ...process.env }
const envPath = join(ROOT, '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

// ── Walk the source tree once ───────────────────────────────
function sources(dir, acc = []) {
  if (!existsSync(dir)) return acc
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) sources(p, acc)
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(p)
  }
  return acc
}
const files = ['app', 'lib', 'components', 'utils', 'context'].flatMap((d) => sources(join(ROOT, d)))
const allSource = files.map((f) => readFileSync(f, 'utf-8')).join('\n')

// ══════════════════════════════════════════════════════════
// 1. Environment
// ══════════════════════════════════════════════════════════
heading('Environment')

// Which features each var belongs to, so a missing one says what breaks.
const ENV_FEATURES = {
  NEXT_PUBLIC_SUPABASE_URL: ['everything', true],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ['everything', true],
  SUPABASE_SERVICE_ROLE_KEY: ['public quote and invoice pages, unsubscribe', true],
  ANTHROPIC_API_KEY: ['FieldMS Fault Finder', true],
  RESEND_API_KEY: ['sending quotes and invoices by email', false],
  RESEND_FROM_EMAIL: ['sending quotes and invoices by email', false],
  TWILIO_ACCOUNT_SID: ['SMS job notifications', false],
  TWILIO_AUTH_TOKEN: ['SMS job notifications', false],
  TWILIO_PHONE_NUMBER: ['SMS job notifications', false],
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: ['job maps and tracking', false],
  XERO_CLIENT_ID: ['Xero connection', false],
  XERO_CLIENT_SECRET: ['Xero connection', false],
  XERO_SCOPE: ['Xero connection', false],
  MYOB_CLIENT_ID: ['MYOB connection', false],
  MYOB_CLIENT_SECRET: ['MYOB connection', false],
  MYOB_API_KEY: ['MYOB connection', false],
  MYOB_SCOPE: ['MYOB connection', false],
  MYOB_API_VERSION: ['MYOB connection', false],
  CRON_SECRET: ['scheduled price refresh', false],
}

const usedVars = [...new Set([...allSource.matchAll(/process\.env\.([A-Z_][A-Z0-9_]*)/g)].map((m) => m[1]))]
  .filter((v) => v !== 'NODE_ENV')

const missingRequired = []
const missingOptional = new Map()

for (const v of usedVars.sort()) {
  const [feature, required] = ENV_FEATURES[v] ?? ['unknown feature', false]
  if (env[v]) continue
  if (required) missingRequired.push([v, feature])
  else {
    if (!missingOptional.has(feature)) missingOptional.set(feature, [])
    missingOptional.get(feature).push(v)
  }
}

if (!missingRequired.length && !missingOptional.size) {
  pass(`all ${usedVars.length} environment variables the code reads are set`)
} else {
  for (const [v, feature] of missingRequired) fail(`${v} is not set`, `Breaks: ${feature}`)
  for (const [feature, vars] of missingOptional) {
    warn(`${feature} is not configured`, `Missing: ${vars.join(', ')}`)
  }
}

// ══════════════════════════════════════════════════════════
// 2. Schema — the check that would have caught the big one
// ══════════════════════════════════════════════════════════
heading('Database schema')

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

// Everything the app queries, derived from the source rather than assumed.
// The scanner lives in scripts/lib/scan-schema.mjs so that this command and
// supabase/VERIFY_SCHEMA.sql cannot drift apart: the SQL file is generated
// from the same function by scripts/build-verify-sql.mjs.
const required = scanSchemaUsage(files.map((f) => readFileSync(f, 'utf-8')))
const BUCKETS = dropStorageBuckets(required, files.map((f) => readFileSync(f, "utf-8")))

console.log(`  ${C.dim}${required.size} tables and views required by the code${C.off}`)

if (!url || !serviceKey) {
  fail('Cannot check the live schema', 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed.')
} else {
  const rest = async (path) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    return res
  }

  try {
    // HEAD each table. 404 / PGRST205 means the relation does not exist.
    const missing = []
    const ok = []
    for (const table of [...required.keys()].sort()) {
      const res = await rest(`${table}?select=*&limit=0`)
      if (res.status === 404 || res.status === 400) {
        const body = await res.text()
        if (/does not exist|PGRST205|Could not find the table/i.test(body)) missing.push(table)
        else ok.push(table)
      } else ok.push(table)
    }

    if (missing.length) {
      fail(`${missing.length} of ${required.size} tables or views are missing`,
           missing.join(', '))
      console.log(`        ${C.dim}Fix: run supabase/RUN_ALL.sql in the SQL editor.${C.off}`)
    } else {
      pass(`all ${ok.length} tables and views exist`)
    }

    // Columns, for the tables that do exist
    let colProblems = 0
    for (const [table, cols] of [...required.entries()].sort()) {
      if (missing.includes(table) || !cols.size) continue
      const res = await rest(`${table}?select=${[...cols].join(',')}&limit=0`)
      if (!res.ok) {
        const body = await res.text()
        const m = body.match(/column "?([a-z_.]+)"? does not exist|Could not find the '([a-z_]+)' column/i)
        const col = m ? (m[1] ?? m[2]) : 'unknown'
        fail(`${table}: column ${col} is missing`, 'The code selects it but the database does not have it.')
        colProblems++
      }
    }
    if (!colProblems && !missing.length) pass('every column the code selects exists')
  } catch (err) {
    fail('Could not reach the database', String(err.message ?? err))
  }
}

// ══════════════════════════════════════════════════════════
// 3. Storage buckets
// ══════════════════════════════════════════════════════════
heading('Storage')

if (!url || !serviceKey) {
  warn('Skipped: no Supabase credentials')
} else {
  try {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    })
    if (!res.ok) {
      warn(`Could not list buckets (HTTP ${res.status})`)
    } else {
      const existing = new Set((await res.json()).map((b) => b.id ?? b.name))
      const absent = BUCKETS.filter((b) => !existing.has(b))
      if (absent.length) {
        fail(`${absent.length} storage bucket(s) missing: ${absent.join(', ')}`,
             'Uploads fail with "Bucket not found". Fix: run migration 026_storage_buckets.sql.')
      } else {
        pass(`all ${BUCKETS.length} buckets exist (${BUCKETS.join(', ')})`)
      }
    }
  } catch (err) {
    warn('Could not reach storage', String(err.message ?? err))
  }
}

// ══════════════════════════════════════════════════════════
// 4. Anthropic key, if set
// ══════════════════════════════════════════════════════════
heading('FieldMS Fault Finder')

const model = existsSync(join(ROOT, 'app/api/assistant/route.ts'))
  ? (readFileSync(join(ROOT, 'app/api/assistant/route.ts'), 'utf-8').match(/model:\s*'([^']+)'/) || [])[1]
  : null

for (const f of ['system_prompt.md', 'fault_finding_manual.md']) {
  const p = join(ROOT, 'knowledge', 'fault-finder', f)
  if (existsSync(p)) pass(`knowledge/fault-finder/${f}`)
  else fail(`knowledge/fault-finder/${f} is missing`, 'The assistant route reads this at request time.')
}

if (!env.ANTHROPIC_API_KEY) {
  // already reported above
} else if (!model) {
  fail('Could not read the model id from app/api/assistant/route.ts')
} else {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model, max_tokens: 8, messages: [{ role: 'user', content: 'ok' }] }),
    })
    const body = await res.json()
    if (res.ok) pass(`API reachable, model ${model} accepted`)
    else {
      const type = body.error?.type ?? res.status
      const msg = body.error?.message ?? ''
      if (type === 'authentication_error') fail('API key rejected')
      else if (type === 'not_found_error') fail(`Model "${model}" not found`, 'Check platform.claude.com/docs for current ids.')
      else if (/credit balance/i.test(msg)) fail('No credit balance on the Anthropic account')
      else if (type === 'rate_limit_error') warn('Rate limited, but the key is valid')
      else fail(`API error (${type})`, msg)
    }
  } catch (err) {
    fail('Could not reach api.anthropic.com', String(err.message ?? err))
  }
}

// ══════════════════════════════════════════════════════════
heading('Result')
if (failures === 0 && warnings === 0) {
  console.log(`  ${C.green}Everything the app needs is present.${C.off}\n`)
} else if (failures === 0) {
  console.log(`  ${C.yellow}${warnings} optional feature(s) not configured. Nothing is broken.${C.off}\n`)
} else {
  console.log(`  ${C.red}${failures} problem(s) that will break the app.${C.off}`)
  if (warnings) console.log(`  ${C.yellow}${warnings} optional feature(s) not configured.${C.off}`)
  console.log('')
  process.exitCode = 1
}
