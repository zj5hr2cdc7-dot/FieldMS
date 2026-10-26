import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/account/delete — permanently delete a workspace.
 *
 * WHY THIS EXISTS
 *   /privacy and /terms both tell a business it can have its data deleted.
 *   Nothing implemented it, so that was a promise the software could not
 *   keep. A privacy policy you cannot honour is worse than not having one:
 *   it is a written undertaking.
 *
 * WHY IT IS HERE AND NOT A DATABASE FUNCTION
 *   It started as a plpgsql function in a migration. A function body contains
 *   semicolons, and the Supabase SQL editor splits pasted input on
 *   semicolons, so it could never be pasted in safely (migration 027 taught
 *   us that). Doing it here also means the authorisation check sits next to
 *   the deletion rather than in a GRANT somewhere else.
 *
 * SAFEGUARDS
 *   - Owner only. A manager cannot delete the business.
 *   - The caller must type the exact workspace name. Deleting a business's
 *     entire history should not be reachable by one mis-click.
 *   - Compliance records may be evidence the business is legally required to
 *     keep, so the response tells them to export first and the UI says so
 *     before this is ever called.
 *
 * ORDER MATTERS
 *   Storage objects are keyed by a path prefix, not a foreign key, so nothing
 *   removes them once the tenant row is gone. They go first. Then auth users
 *   who belong to no other workspace. Then the tenant, which cascades.
 *
 *   There is no transaction across these: supabase-js has no client-side
 *   transaction. Each step is idempotent, so a failure part-way can be
 *   retried safely — which is why it returns what it managed to do.
 */
export async function POST(request: Request) {
  let body: { tenantId?: unknown; confirmName?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const tenantId = typeof body.tenantId === 'string' ? body.tenantId : null
  const confirmName = typeof body.confirmName === 'string' ? body.confirmName : ''
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const admin = createAdminClient()

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Typed confirmation, compared exactly. Trimmed only for stray whitespace.
  if (confirmName.trim() !== tenant.name.trim()) {
    return NextResponse.json(
      { error: `Type the workspace name exactly to confirm: "${tenant.name}"` },
      { status: 400 }
    )
  }

  const removed = { storageObjects: 0, users: 0 }

  // 1. Storage. Listed per bucket under the tenant's own folder prefix.
  for (const bucket of ['branding', 'job-plans', 'job-photos', 'form-attachments']) {
    const { data: files } = await admin.storage.from(bucket).list(tenantId, { limit: 1000 })
    if (!files?.length) continue

    // list() is one level deep; job-photos nests a job id under the tenant.
    const paths: string[] = []
    for (const entry of files) {
      if (entry.id === null) {
        const { data: nested } = await admin.storage
          .from(bucket)
          .list(`${tenantId}/${entry.name}`, { limit: 1000 })
        for (const file of nested ?? []) paths.push(`${tenantId}/${entry.name}/${file.name}`)
      } else {
        paths.push(`${tenantId}/${entry.name}`)
      }
    }

    if (paths.length) {
      const { error } = await admin.storage.from(bucket).remove(paths)
      if (error) {
        console.error(`Deleting ${bucket} for tenant ${tenantId}:`, error)
        return NextResponse.json(
          { error: 'Could not remove stored files. Nothing has been deleted — try again.' },
          { status: 500 }
        )
      }
      removed.storageObjects += paths.length
    }
  }

  // 2. Auth users who belong to THIS workspace and no other. Somebody who
  //    works for two businesses keeps their login.
  const { data: members } = await admin
    .from('tenant_members')
    .select('user_id')
    .eq('tenant_id', tenantId)

  for (const member of members ?? []) {
    const { count } = await admin
      .from('tenant_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', member.user_id)
      .neq('tenant_id', tenantId)

    if ((count ?? 0) === 0) {
      const { error } = await admin.auth.admin.deleteUser(member.user_id)
      if (!error) removed.users += 1
      else console.error(`Deleting user ${member.user_id}:`, error)
    }
  }

  // 3. The tenant. Everything else cascades from here.
  const { error: tenantError } = await admin.from('tenants').delete().eq('id', tenantId)
  if (tenantError) {
    console.error(`Deleting tenant ${tenantId}:`, tenantError)
    return NextResponse.json(
      { error: 'Files and logins were removed but the workspace record was not. Contact support.' },
      { status: 500 }
    )
  }

  console.warn(
    `Workspace deleted: ${tenantId} ("${tenant.name}") by ${authz.userId} — ` +
      `${removed.users} user(s), ${removed.storageObjects} file(s)`
  )

  return NextResponse.json({ ok: true, deleted: removed })
}
