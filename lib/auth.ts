import type { AuthSession, AuthUser, Tenant, TenantMember, Profile } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

// Client-side auth functions
export async function getCurrentSessionClient(): Promise<AuthSession | null> {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return null

  const profile = await getProfile(session.user.id)
  if (!profile) return null

  const tenant = profile.default_tenant_id
    ? await getTenant(profile.default_tenant_id)
    : null

  const roleStr = tenant
    ? await getUserRoleInTenant(session.user.id, tenant.id)
    : null
  const role = (roleStr as 'owner' | 'admin' | 'member' | null) || null

  return {
    user: session.user as unknown as AuthUser,
    profile,
    tenant,
    role,
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select()
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select()
    .eq('id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

export async function updateTenant(tenantId: string, updates: Partial<Pick<Tenant, 'name' | 'google_reviews_url' | 'abn' | 'phone' | 'website'>>): Promise<Tenant> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserTenants(userId: string): Promise<Tenant[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)

  if (error) throw error

  if (!data || data.length === 0) return []

  const tenantIds = data.map((m) => m.tenant_id)

  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select()
    .in('id', tenantIds)

  if (tenantsError) throw tenantsError

  return tenants || []
}

export async function getUserRoleInTenant(
  userId: string,
  tenantId: string
): Promise<string | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data?.role || null
}

export async function createTenant(
  userId: string,
  name: string,
  slug: string
): Promise<Tenant> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('create_tenant_with_owner', {
    tenant_name: name,
    tenant_slug: slug,
    user_id: userId,
  })

  if (error) throw error

  // Fetch and return the created tenant
  return getTenant(data) as Promise<Tenant>
}

export async function getTenantMembers(
  tenantId: string
): Promise<(TenantMember & { profiles: Profile })[]> {
  const supabase = createClient()

  // Two-step query: tenant_members has no direct FK to profiles (it FK's auth.users)
  const { data: members, error } = await supabase
    .from('tenant_members')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) throw error
  if (!members?.length) return []

  const userIds = members.map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds)

  return members.map((m) => ({
    ...m,
    profiles: (profiles?.find((p) => p.id === m.user_id) ?? null) as Profile,
  }))
}

export async function addTenantMember(
  tenantId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenant_members')
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      role,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTenantMemberRole(
  tenantId: string,
  userId: string,
  role: 'owner' | 'admin' | 'member'
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenant_members')
    .update({ role })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function removeTenantMember(tenantId: string, userId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('tenant_members')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Email a password recovery link.
 *
 * The link lands on /reset-password, which exchanges the code for a short
 * lived session and lets the user set a new password. Supabase does not
 * reveal whether an address is registered, and neither should we, so the
 * caller should show the same confirmation either way.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

/** Set a new password for the user in the current (recovery) session. */
export async function updatePassword(password: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

/**
 * Complete a recovery from a `token_hash` link.
 *
 * Unlike the PKCE `?code=` exchange this needs no verifier stored in the
 * browser, so the link still works if it is opened on a different device or
 * in a different browser to the one that requested it.
 */
export async function verifyRecoveryLink(tokenHash: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
  if (error) throw error
}

/**
 * Complete a recovery from the six digit code in the email.
 *
 * This is the path that survives corporate mail scanners. Outlook and
 * Microsoft Defender Safe Links pre-fetch every URL in an incoming message
 * to check it, and because Supabase recovery links are single use, that
 * automated visit consumes the token before the human ever clicks. A typed
 * code cannot be consumed by a scanner.
 */
export async function verifyRecoveryCode(email: string, code: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' })
  if (error) throw error
}

/**
 * Turn an auth error into something a human can act on.
 *
 * The common failure in development is not a wrong password: it is that the
 * Supabase project is unreachable (paused on the free tier, deleted, or the
 * URL in .env.local is wrong). supabase-js surfaces that as a bare
 * "Failed to fetch", which looks like a bug in the login form. Name it.
 */
export function describeAuthError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : ''

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Cannot reach the FieldMS server. Check your connection, and if you are running locally check that the Supabase project is awake and NEXT_PUBLIC_SUPABASE_URL is correct.'
  }
  if (/invalid login credentials/i.test(message)) {
    return 'That email and password do not match an account.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Confirm your email address first. Check your inbox for the verification link.'
  }
  if (/same as the old password|should be different/i.test(message)) {
    return 'That is the password you already have. Choose a different one.'
  }
  if (/otp_expired|expired/i.test(message)) {
    return 'That code or link has expired. Request a new one.'
  }
  if (/invalid.*(token|code|otp)|token.*(invalid|not found)/i.test(message)) {
    return 'That code is not right. Check the email and try again.'
  }
  if (/rate limit|too many/i.test(message)) {
    return 'Too many attempts. Wait a minute and try again.'
  }
  return message || fallback
}
