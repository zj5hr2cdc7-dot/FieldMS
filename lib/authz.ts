/**
 * Server-side authorisation for API routes.
 *
 * WHY THIS EXISTS
 *   Every API route that touches tenant data has to answer the same two
 *   questions — who is calling, and are they a member of the tenant they are
 *   asking about — and before this file each route answered them slightly
 *   differently, or not at all. The audit found:
 *
 *     • /api/integrations/[provider]/connect had NO authentication, took
 *       tenant_id from a query string and trusted it.
 *     • /api/integrations/[provider]/callback checked that SOMEBODY was
 *       signed in, then wrote OAuth tokens against whatever tenant id came
 *       back out of a cookie, without checking the caller belonged to it.
 *     • Four routes used supabase.auth.getSession() to authorise.
 *
 *   One helper, used everywhere, is the fix. Add a route, call this.
 *
 * WHY getUser() AND NOT getSession()
 *   getSession() reads the session out of the request cookies and decodes it
 *   locally. It does not ask the auth server whether that token is still
 *   valid, so it will happily return a session for a token that has been
 *   revoked, and it trusts data that arrived from the client. getUser()
 *   revalidates against Supabase Auth. Supabase's own guidance is to never
 *   authorise on getSession() in server code, and authorisation is exactly
 *   what these routes are doing.
 *
 * WHAT THIS IS NOT
 *   It is not a replacement for row level security. Routes that use the
 *   service-role client bypass RLS entirely, so for those this check is the
 *   only thing standing between a caller and another business's data — but
 *   for ordinary routes RLS is still the backstop, and both should hold.
 */

import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normaliseRole, type Role } from '@/lib/roles'

export type AuthzFailure = { ok: false; status: 401 | 403 | 404; error: string }
export type AuthzSuccess = { ok: true; userId: string; tenantId: string; role: Role }
export type AuthzResult = AuthzFailure | AuthzSuccess

/** The signed-in user, revalidated against Supabase Auth. */
export async function requireUser(): Promise<
  { ok: true; userId: string } | AuthzFailure
> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, status: 401, error: 'Not authenticated' }
  return { ok: true, userId: user.id }
}

/**
 * The signed-in user AND proof they belong to `tenantId`.
 *
 * Membership is read with the admin client deliberately: callers of this
 * helper are usually about to use the admin client themselves, and reading
 * the membership through RLS would mean a missing policy silently downgrades
 * a 403 into a 200. Reading it directly makes the check independent of
 * whatever policies happen to be in place.
 */
export async function requireTenantMember(tenantId: string): Promise<AuthzResult> {
  const user = await requireUser()
  if (!user.ok) return user

  if (!tenantId || typeof tenantId !== 'string') {
    return { ok: false, status: 403, error: 'Forbidden' }
  }

  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.userId)
    .maybeSingle()

  // Deliberately 403 and not 404: distinguishing "no such tenant" from "not
  // your tenant" tells an attacker which tenant ids are real.
  if (!membership) return { ok: false, status: 403, error: 'Forbidden' }

  return {
    ok: true,
    userId: user.userId,
    tenantId,
    role: normaliseRole(membership.role),
  }
}

/**
 * Membership of the tenant that owns `jobId`, resolved from the job itself so
 * the caller cannot nominate the tenant.
 */
export async function requireJobAccess(jobId: string): Promise<AuthzResult> {
  const user = await requireUser()
  if (!user.ok) return user

  const admin = createAdminClient()
  const { data: job } = await admin
    .from('jobs')
    .select('tenant_id')
    .eq('id', jobId)
    .maybeSingle()

  // 403 rather than 404 for the same reason as above: a 404 here confirms
  // that a guessed job id does not exist, and a 403 confirms nothing.
  if (!job) return { ok: false, status: 403, error: 'Forbidden' }

  return requireTenantMember(job.tenant_id)
}

/** Require one of `roles` within the tenant. */
export async function requireTenantRole(
  tenantId: string,
  roles: Role[]
): Promise<AuthzResult> {
  const result = await requireTenantMember(tenantId)
  if (!result.ok) return result
  if (!roles.includes(result.role)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }
  return result
}
