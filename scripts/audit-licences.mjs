#!/usr/bin/env node
/**
 * Licence audit of the installed dependency tree.
 *
 * Walks node_modules rather than reading package.json, because transitive
 * dependencies are where licence problems actually live — the direct list is
 * nine packages, the real tree is around four hundred.
 *
 * Flags copyleft and unknown licences. Exits 1 if any are found, so this can
 * gate CI.
 *
 * Pairs with `npm audit --omit=dev` for vulnerabilities; see
 * OPEN_SOURCE_AUDIT.md for the interpretation.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/*
 * Licences that need a human decision before shipping proprietary software.
 * LGPL is deliberately NOT here: consuming an unmodified LGPL library through
 * require() is the dynamic-linking case the licence permits. It is reported
 * separately so it stays visible without failing the build.
 */
const COPYLEFT = /\b(A?GPL|SSPL|CC-BY-NC|CPAL|OSL|EUPL)\b/i
const LGPL = /\bLGPL\b/i

function licenceOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses.map((l) => l.type ?? l).join(' OR ')
  }
  return 'UNKNOWN'
}

const counts = new Map()
const flagged = []
const lgpl = []
let total = 0

function walk(dir) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const path = join(dir, entry.name)

    // Scope directories (@scope/name) hold packages one level down.
    if (entry.name.startsWith('@')) {
      walk(path)
      continue
    }
    if (entry.name === '.bin') continue

    try {
      const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'))
      const licence = licenceOf(pkg)
      const id = `${pkg.name}@${pkg.version}`

      total++
      counts.set(licence, (counts.get(licence) ?? 0) + 1)

      if (LGPL.test(licence)) lgpl.push(`${id} :: ${licence}`)
      else if (COPYLEFT.test(licence) || licence === 'UNKNOWN') {
        flagged.push(`${id} :: ${licence}`)
      }
    } catch {
      // Not a package directory.
    }

    // Nested node_modules (npm does this when versions conflict).
    walk(join(path, 'node_modules'))
  }
}

walk(join(ROOT, 'node_modules'))

console.log(`\nLICENCE AUDIT — ${total} installed packages\n`)
for (const [licence, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(5)}  ${licence}`)
}

if (lgpl.length) {
  console.log(`\nLGPL (${lgpl.length}) — permitted when used unmodified via require():`)
  for (const line of lgpl) console.log(`  ${line}`)
}

console.log(`\nFLAGGED (${flagged.length}):`)
for (const line of flagged) console.log(`  ${line}`)

if (flagged.length) {
  console.log('\nFAIL — copyleft or unknown licences need a decision before shipping.\n')
  process.exit(1)
}
console.log('\nPASS — no copyleft or unknown licences.\n')
