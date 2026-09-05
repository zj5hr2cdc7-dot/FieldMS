'use client'

import { useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { updateProfile } from '@/lib/auth'

export default function ProfilePage() {
  const { session, refetchSession } = useAuthContext()
  const [fullName, setFullName] = useState(session?.profile?.full_name || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!session?.user?.id) throw new Error('User not found')

      await updateProfile(session.user.id, {
        full_name: fullName,
      })

      setSuccess('Profile updated successfully!')
      await refetchSession()
    } catch (err) {
      setError((err instanceof Error ? err.message : null) || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1">Update your personal information</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

        <form onSubmit={handleUpdateProfile} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
              Email (read-only)
            </label>
            <input
              id="email"
              type="email"
              value={session?.user?.email || ''}
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {loading ? 'Updating…' : 'Update profile'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Account information</h2>
        <dl className="space-y-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">User ID</dt>
            <dd className="text-xs font-mono text-slate-700 break-all mt-1">{session?.user?.id}</dd>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Created</dt>
            <dd className="text-sm text-slate-700 mt-1">
              {session?.user?.created_at ? new Date(session.user.created_at).toLocaleDateString('en-AU') : '—'}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
