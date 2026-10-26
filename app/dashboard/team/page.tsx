'use client'

import { useState, useEffect } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getTenantMembers, removeTenantMember } from '@/lib/auth'
import { inviteTeamMember } from '@/lib/team'
import { normaliseRole } from '@/lib/roles'
import type { TenantMember, Profile } from '@/types/database'

export default function TeamPage() {
  const { currentTenant, userRole } = useAuthContext()
  const [members, setMembers] = useState<(TenantMember & { profiles: Profile })[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'technician' | 'manager'>('technician')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchMembers = async () => {
    if (!currentTenant) return
    try {
      const data = await getTenantMembers(currentTenant.id)
      setMembers(data)
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [currentTenant])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentTenant) return

    setSending(true)
    try {
      const address = email.trim()
      const { invited } = await inviteTeamMember(currentTenant.id, address, role)
      setEmail('')
      setSuccess(
        invited
          ? `Invite sent to ${address}. They set a password from the email, then sign in.`
          : `${address} already had a FieldMS account and has been added to this workspace.`
      )
      await fetchMembers()
    } catch (err) {
      setError((err instanceof Error ? err.message : null) || 'Failed to add member')
    } finally {
      setSending(false)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!currentTenant) return
    try {
      await removeTenantMember(currentTenant.id, userId)
      await fetchMembers()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  // Managing staff is owner only (lib/roles.ts manageStaff), and the API
  // route enforces the same rule. normaliseRole maps legacy role names.
  const isAdmin = normaliseRole(userRole) === 'owner'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500 mt-1">Manage workspace members and roles</p>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Invite team member</h2>
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}
          <form onSubmit={handleAddMember} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'technician' | 'manager')}
              aria-label="Role"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            >
              <option value="technician">Technician</option>
              <option value="manager">Manager</option>
            </select>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            >
              {sending ? 'Sending…' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Members ({members.length})</h2>
        </div>
        {loading ? (
          <div className="p-6 text-sm text-slate-400">Loading members…</div>
        ) : members.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No team members yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.id} className="px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-bold text-white shrink-0">
                    {member.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{member.profiles?.full_name || '—'}</p>
                    <p className="text-sm text-slate-500">{member.profiles?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 capitalize border border-slate-200">
                    {member.role}
                  </span>
                  {isAdmin && member.role !== 'owner' && (
                    <button
                      onClick={() => handleRemoveMember(member.user_id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
