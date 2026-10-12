/**
 * Client helper for inviting staff. All the work happens in
 * app/api/team/invite/route.ts; see the comment there for why.
 */
export async function inviteTeamMember(
  tenantId: string,
  email: string,
  role: 'technician' | 'manager' = 'technician'
): Promise<{ invited: boolean }> {
  const res = await fetch('/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId, email, role }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Could not invite that person')
  return { invited: Boolean(data.invited) }
}
