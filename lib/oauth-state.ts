/**
 * Signed OAuth state for the accounting integrations.
 *
 * The connect route hands the browser a cookie describing the in-flight OAuth
 * flow, and the callback route reads it back to decide which tenant to attach
 * the resulting tokens to. That cookie used to be plain base64 — an encoding,
 * not a signature — so anyone able to set a cookie on the domain could name
 * any tenant they liked and have the callback write their own accounting
 * credentials onto another business's workspace.
 *
 * Signing it with a server-held secret closes that. It lives in lib/ rather
 * than beside the routes because a Next.js route module may only export
 * route handlers and route config; exporting helpers from one fails the build.
 */

import { createHmac, timingSafeEqual } from 'crypto'

export interface OAuthStatePayload {
  provider: string
  tenantId: string
  state: string
  userId: string
}

/**
 * Prefer OAUTH_STATE_SECRET. The service role key is a fallback only so that
 * a deployment missing the variable still signs with something secret rather
 * than an empty string — but rotating the service role key should not
 * invalidate in-flight OAuth flows, so set the dedicated variable.
 */
function secret(): string {
  const value = process.env.OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!value) throw new Error('No secret available to sign the OAuth state')
  return value
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Encode and sign. Returns the cookie value. */
export function encodeState(payload: OAuthStatePayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

/**
 * Verify and decode. Returns null for anything that is not a cookie we
 * issued — wrong shape, bad signature, or unparseable payload.
 */
export function decodeState(cookieValue: string | undefined): OAuthStatePayload | null {
  if (!cookieValue) return null

  const [encoded, signature] = cookieValue.split('.')
  if (!encoded || !signature) return null

  // Constant-time, so the signature cannot be recovered byte by byte by
  // timing repeated requests.
  const expected = Buffer.from(sign(encoded))
  const given = Buffer.from(signature)
  if (expected.length !== given.length) return null
  if (!timingSafeEqual(expected, given)) return null

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (
      typeof parsed?.provider !== 'string' ||
      typeof parsed?.tenantId !== 'string' ||
      typeof parsed?.state !== 'string' ||
      typeof parsed?.userId !== 'string'
    ) {
      return null
    }
    return parsed as OAuthStatePayload
  } catch {
    return null
  }
}
