import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { SITE_URL } from '@/lib/seo'

/**
 * POST /api/team/invite — add a person to a workspace by email.
 *
 * WHY THIS IS A SERVER ROUTE
 *   The Team page and the onboarding wizard used to call addTenantMember()
 *   from the browser with the typed EMAIL in the user_id column (a UUID) and
 *   the legacy role 'member', which migration 024's CHECK constraint rejects.
 *   Every invite failed, and onboarding swallowed the error. Turning an email
 *   into a user, and emailing someone who has no account yet, both need the
 *   service-role key, so this has to happen on the server.
 *
 * Owner only, matching lib/roles.ts (manageStaff) and the Settings page.
 */

const ROLES = ['technician', 'manager'] as const
type InviteRole = (typeof ROLES)[number]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  let body: { tenantId?: unknown; email?: unknown; role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const { tenantId, email, role } = body
  if (typeof tenantId !== 'string' || typeof email !== 'string') {
    return NextResponse.json({ error: 'tenantId and email are required' }, { status: 400 })
  }

  const address = email.trim().toLowerCase()
  if (address.length > 254 || !EMAIL_RE.test(address)) {
    return NextResponse.json({ error: 'That email address does not look right' }, { status: 400 })
  }

  const memberRole: InviteRole = ROLES.includes(role as InviteRole) ? (role as InviteRole) : 'technician'

  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()

  // Supabase Auth stores emails lower-cased and handle_new_user() copies that
  // value into profiles, so an exact match on the normalised address is safe.
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', address)
    .maybeSingle()

  let userId = profile?.id as string | undefined
  let invited = false

  if (!userId) {
    // In production the redirect is pinned to the real domain rather than
    // taken from the request, so a spoofed Host header cannot point the
    // invite link somewhere else. Supabase's redirect allow-list is the
    // second check.
    const origin = process.env.NODE_ENV === 'production' ? SITE_URL : new URL(request.url).origin
    const { data, error } = await admin.auth.admin.inviteUserByEmail(address, {
      redirectTo: `${origin}/reset-password`,
    })
    if (error || !data?.user) {
      console.error('inviteUserByEmail failed:', error)
      return NextResponse.json({ error: 'Could not send the invite email. Try again shortly.' }, { status: 502 })
    }
    userId = data.user.id
    invited = true
  }

  const { data: existing } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'That person is already in this workspace' }, { status: 409 })
  }

  const { error: insertError } = await admin
    .from('tenant_members')
    .insert({ tenant_id: tenantId, user_id: userId, role: memberRole })

  if (insertError) {
    console.error('tenant_members insert failed:', insertError)
    return NextResponse.json({ error: 'Could not add that person to the workspace' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, invited })
}
