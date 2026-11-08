/**
 * Who FieldMS legally is.
 *
 * One source of truth, imported by /terms, /privacy and the site footer, for
 * the same reason lib/plans-public.ts holds the prices: the legal entity
 * appearing differently in two places is the kind of error nobody notices
 * until it matters.
 *
 * Verified against the Australian Business Register on 8 November 2026:
 *   ABN 15 236 755 732 — GAPES, JACK STEVEN
 *   Individual/Sole Trader, active from 3 September 2026
 *   Business name FIELDMS registered from 7 September 2026
 *   Not currently registered for GST
 *   https://abr.business.gov.au/ABN/View?abn=15236755732
 *
 * WHEN THIS CHANGES
 *   If FieldMS Pty Ltd is registered, the contracting entity changes and so
 *   does every one of these values, including the ABN. Account holders must
 *   be told before the terms transfer to a new entity — see /terms section 1.
 *   Update GST_REGISTERED in lib/plans-public.ts at the same time if the
 *   registration status changes; the two are checked against each other
 *   nowhere but here, in this comment.
 */

/** Legal entity that contracts with customers. Not a company. */
export const LEGAL_NAME = 'Jack Steven Gapes'

/** Registered business name the entity trades under. */
export const TRADING_NAME = 'FieldMS'

/** How the entity should be named in a contract or on a tax invoice. */
export const LEGAL_ENTITY = `${LEGAL_NAME}, trading as ${TRADING_NAME}`

/** Formatted the way the ABR prints it, in the spaced groups people check. */
export const ABN = '15 236 755 732'

/** Unspaced, for anything that needs the raw identifier. */
export const ABN_RAW = ABN.replace(/\s/g, '')

export const ABN_LOOKUP_URL = `https://abr.business.gov.au/ABN/View?abn=${ABN_RAW}`

export const JURISDICTION = 'Queensland, Australia'

export const SUPPORT_EMAIL = 'jack.gapes@outlook.com'

/**
 * Validate an ABN with the ATO's published checksum: subtract 1 from the first
 * digit, apply the weights, and the weighted sum must divide by 89.
 *
 * Exported because the onboarding wizard asks every customer for their own ABN
 * and a typo there ends up printed on their certificates and tax invoices.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

export function isValidAbn(input: string): boolean {
  const digits = input.replace(/[^0-9]/g, '')
  if (digits.length !== 11) return false
  const nums = [...digits].map(Number)
  nums[0] -= 1
  const total = nums.reduce((sum, n, i) => sum + n * ABN_WEIGHTS[i], 0)
  return total % 89 === 0
}

/** "15 236 755 732" from any spacing the user typed. Empty string if invalid. */
export function formatAbn(input: string): string {
  const d = input.replace(/[^0-9]/g, '')
  if (d.length !== 11) return input
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`
}
