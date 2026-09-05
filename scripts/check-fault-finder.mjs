#!/usr/bin/env node
/**
 * Fault Finder preflight.
 *
 *   npm run check:fault-finder
 *
 * Verifies everything the assistant needs before you go clicking around the
 * app: the API key is present and valid, the model id is accepted, and the
 * knowledge base is where the route expects it. Prints exactly what is wrong
 * and how to fix it, rather than making you read a 500 in the browser.
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const OFF = '\x1b[0m'

const pass = (m) => console.log(`${GREEN}  ok${OFF}  ${m}`)
const fail = (m, hint) => {
  console.log(`${RED}fail${OFF}  ${m}`)
  if (hint) console.log(`${DIM}      ${hint}${OFF}`)
  failures++
}
const warn = (m) => console.log(`${YELLOW}warn${OFF}  ${m}`)

let failures = 0

console.log('\nFault Finder preflight\n')

// ── 1. Environment ───────────────────────────────────────────
let key = process.env.ANTHROPIC_API_KEY
if (!key) {
  const envPath = join(root, '.env.local')
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const m = line.match(/^\s*ANTHROPIC_API_KEY\s*=\s*(.*)\s*$/)
      if (m) key = m[1].replace(/^["']|["']$/g, '').trim()
    }
  }
}

if (!key) {
  fail(
    'ANTHROPIC_API_KEY is missing',
    'Add it to .env.local. Get one at https://platform.claude.com under API keys.'
  )
} else if (!key.startsWith('sk-ant-')) {
  fail(
    'ANTHROPIC_API_KEY does not look like a key',
    'Anthropic keys start with sk-ant-. Check you pasted the whole value with no quotes.'
  )
} else {
  pass(`ANTHROPIC_API_KEY found (${key.slice(0, 11)}…${key.slice(-4)})`)
}

// ── 2. Knowledge base ────────────────────────────────────────
const dir = join(root, 'knowledge', 'fault-finder')
for (const file of ['system_prompt.md', 'fault_finding_manual.md']) {
  const p = join(dir, file)
  if (!existsSync(p)) {
    fail(`knowledge/fault-finder/${file} is missing`, 'The API route reads this at request time.')
  } else {
    const kb = Math.round(readFileSync(p, 'utf-8').length / 1024)
    pass(`knowledge/fault-finder/${file} (${kb}KB)`)
  }
}

// ── 3. Model id, read straight from the route ────────────────
const routePath = join(root, 'app', 'api', 'assistant', 'route.ts')
const model = existsSync(routePath)
  ? (readFileSync(routePath, 'utf-8').match(/model:\s*'([^']+)'/) || [])[1]
  : null

if (!model) fail('Could not read the model id from app/api/assistant/route.ts')
else pass(`model id: ${model}`)

// ── 4. Live call ─────────────────────────────────────────────
if (key && key.startsWith('sk-ant-') && model) {
  process.stdout.write(`${DIM}      calling the API…${OFF}\r`)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with the single word: ready' }],
      }),
    })

    const body = await res.json()
    process.stdout.write(' '.repeat(40) + '\r')

    if (res.ok) {
      const text = body.content?.[0]?.text?.trim() ?? ''
      pass(`API call succeeded, model replied "${text}"`)
    } else {
      const type = body.error?.type ?? res.status
      const msg = body.error?.message ?? JSON.stringify(body)
      if (type === 'authentication_error') {
        fail('API key rejected', 'The key is wrong, revoked, or from a different organisation.')
      } else if (type === 'not_found_error') {
        fail(`Model "${model}" was not found`, 'Check the id at https://platform.claude.com/docs/en/about-claude/models/overview')
      } else if (type === 'rate_limit_error') {
        warn('Rate limited, but the key itself is valid.')
      } else if (String(msg).includes('credit balance')) {
        fail('No credits on the account', 'Add billing at https://platform.claude.com under Billing.')
      } else {
        fail(`API error (${type})`, msg)
      }
    }
  } catch (err) {
    process.stdout.write(' '.repeat(40) + '\r')
    fail('Could not reach api.anthropic.com', String(err.message ?? err))
  }
}

// ── Result ───────────────────────────────────────────────────
console.log('')
if (failures === 0) {
  console.log(`${GREEN}Fault Finder is ready.${OFF} Restart the dev server if it was already running.\n`)
} else {
  console.log(`${RED}${failures} problem${failures > 1 ? 's' : ''} to fix.${OFF}\n`)
  process.exitCode = 1
}
