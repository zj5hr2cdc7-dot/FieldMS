#!/usr/bin/env node
/**
 * ABN checksum tests. The validator decides whether a customer's ABN is
 * flagged as a typo before it is printed on their quotes, invoices and
 * compliance certificates, so it is worth knowing it rejects a transposition
 * and not just a wrong length.
 *
 * Cases use Jack's own ABN from the register, the ATO's published test ABN,
 * and one publicly listed company, plus deliberate corruptions of each.
 *
 * Run: node scripts/abn-tests.mjs
 */
import { isValidAbn, formatAbn, ABN } from '../lib/business.ts'
const cases = [
  ['15 236 755 732', true,  "Jack's own ABN, from the register"],
  ['15236755732',    true,  'same, unspaced'],
  ['  15-236-755-732 ', true, 'with junk separators'],
  ['51 824 753 556', true,  'ATO public test ABN'],
  ['53 004 085 616', true,  'Telstra, publicly listed'],
  ['15 236 755 733', false, 'last digit wrong'],
  ['51 236 755 732', false, 'first digit wrong'],
  ['15 237 655 732', false, 'transposed digits'],
  ['1523675573',     false, 'only 10 digits'],
  ['152367557320',   false, '12 digits'],
  ['',               false, 'empty'],
  ['abcdefghijk',    false, 'not numeric'],
]
let fail = 0
for (const [input, want, why] of cases) {
  const got = isValidAbn(input)
  const ok = got === want
  if (!ok) fail++
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${String(input).padEnd(18)} -> ${String(got).padEnd(5)} ${why}`)
}
console.log('\nformatAbn("15236755732") =', JSON.stringify(formatAbn('15236755732')))
console.log('exported ABN             =', JSON.stringify(ABN))
console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILED`)
