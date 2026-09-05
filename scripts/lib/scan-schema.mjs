/**
 * Scan the codebase for everything it asks of the database.
 *
 * WHY THIS IS A SEPARATE MODULE
 *   `npm run doctor` and `supabase/VERIFY_SCHEMA.sql` are meant to be the same
 *   check on two surfaces. They were not: the SQL file carried a hand-copied
 *   list of expectations that could drift from the scanner the moment either
 *   changed. Both now derive from this one function, and the SQL file is
 *   generated rather than edited.
 *
 * THE BUG THIS FIXES
 *   The previous scanner split a select string on commas and kept anything
 *   that looked like an identifier. PostgREST embedded resources broke it:
 *
 *     .select('*, estimate_items(id, name, quantity, unit_price, total)')
 *
 *   split on commas gives ['*', ' estimate_items(id', ' name', ' quantity',
 *   ' unit_price', ' total)']. Everything after the paren was recorded as a
 *   column of `estimates`, which has none of them. That produced ten false
 *   failures — noise that a real failure could hide inside, which is exactly
 *   how the original 31 missing tables went unnoticed for so long.
 *
 *   The parser below tracks bracket depth, splits only on top level commas,
 *   and recurses into an embed so its columns are attributed to the embedded
 *   table. The false positives become real coverage.
 */

/**
 * Split on commas that are not inside brackets.
 * 'a, b(c, d), e' -> ['a', 'b(c, d)', 'e']
 */
export function splitTopLevel(input) {
  const parts = []
  let depth = 0
  let current = ''
  for (const ch of input) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/**
 * Parse a PostgREST select string, attributing each column to the table it
 * actually belongs to.
 *
 * @param {string} selectString  the contents of .select('...')
 * @param {string} table         the table .from() was called on
 * @param {(table: string, column: string) => void} record
 */
export function parseSelect(selectString, table, record) {
  for (const part of splitTopLevel(selectString)) {
    const open = part.indexOf('(')

    // ── An embedded resource: recurse, do not attribute to the parent ──
    if (open !== -1) {
      const close = part.lastIndexOf(')')
      const inner = close > open ? part.slice(open + 1, close) : ''

      // 'alias:table!inner' / 'table!left' / 'table' -> 'table'
      let head = part.slice(0, open).trim()
      if (head.includes(':')) head = head.split(':').pop().trim()
      head = head.split('!')[0].trim()

      // Aggregates like count() name no table and have nothing to recurse into.
      if (/^[a-z_][a-z0-9_]*$/.test(head) && inner.trim()) {
        // An embedded table must exist even when only '*' is selected from it.
        record(head, null)
        parseSelect(inner, head, record)
      }
      continue
    }

    // ── A plain column ──
    let col = part
    if (col.includes(':')) col = col.split(':').pop().trim()   // alias:column
    col = col.split('->')[0].trim()                            // jsonb->>'x'
    col = col.replace(/::[a-z_]+$/i, '').trim()                // a cast
    if (col === '*' || col === '') continue
    if (/^[a-z_][a-z0-9_]*$/.test(col)) record(table, col)
  }
}

/**
 * Walk source text and return Map<table, Set<column>>.
 *
 * @param {string[]} sources  file contents
 */
export function scanSchemaUsage(sources) {
  const required = new Map()
  const add = (table, column) => {
    if (!required.has(table)) required.set(table, new Set())
    if (column) required.get(table).add(column)
  }

  // .from('x') followed by its chained calls. Nested parens are allowed one
  // level deep, which covers .select('a, b(c)') and the filter helpers.
  const fromRe = /\.from\('([a-z_]+)'\)((?:\s*\.\w+\([^()]*(?:\([^()]*\))?[^()]*\))*)/gs

  for (const src of sources) {
    for (const m of src.matchAll(fromRe)) {
      const table = m[1]
      add(table, null)
      const chain = m[2] ?? ''

      for (const sel of chain.matchAll(/\.select\(\s*'([^']*)'/gs)) {
        parseSelect(sel[1], table, add)
      }

      // Filters and ordering name columns on the table itself, except when
      // dotted ('jobs.status' targets an embedded table).
      for (const f of chain.matchAll(
        /\.(?:eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|order)\(\s*'([a-z_][a-z0-9_.]*)'/g
      )) {
        const ref = f[1]
        if (ref.includes('.')) {
          const parts = ref.split('.')
          add(parts[0], parts[parts.length - 1])
        } else {
          add(table, ref)
        }
      }
    }
  }

  return required
}

/**
 * Buckets reached through storage.from() are not tables.
 *
 * Two things the earlier one-line regex missed, both of which meant a bucket
 * went unchecked rather than reported:
 *
 *   1. The call is often split across lines:
 *        await admin.storage
 *          .from('job-photos')
 *   2. The name is often a constant, not a literal:
 *        const BUCKET = 'job-photos'
 *        supabase.storage.from(BUCKET)
 *
 *   `job-photos` was invisible for the second reason, so nothing verified the
 *   bucket that every site photo is written to.
 *
 * @param {Map<string, Set<string>>} required
 * @param {string[]|string} sources  file contents (array preferred: constants
 *                                   are resolved per file)
 */
export function dropStorageBuckets(required, sources) {
  const files = Array.isArray(sources) ? sources : [sources]
  const found = new Set()

  for (const src of files) {
    // const BUCKET = 'job-photos'  ->  { BUCKET: 'job-photos' }
    const consts = {}
    for (const m of src.matchAll(
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*'([^']+)'/g
    )) {
      consts[m[1]] = m[2]
    }

    for (const m of src.matchAll(
      /\.storage\s*\.from\(\s*(?:'([^']+)'|([A-Za-z_$][\w$]*))\s*\)/gs
    )) {
      const name = m[1] ?? consts[m[2]]
      if (name) found.add(name)
    }
  }

  const buckets = [...found]
  for (const b of buckets) required.delete(b)
  return buckets
}
