'use client'

/* ============================================================
   Finish setting up — for a signed-in user with no workspace.

   Signup now creates the workspace in the database alongside the user
   (migration 037), so new accounts should never land here. This screen
   exists for the ones that already did: accounts made before 037, where
   the browser's second step never ran and the field app sat on
   "Loading your day..." forever. The dashboard and field layouts send any
   signed-in user with no membership here instead of hanging.
   ============================================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, { AuthHeading, Eyebrow } from '@/components/AuthShell'
import { useAuthContext } from '@/context/AuthContext'
import { createTenant, describeAuthError } from '@/lib/auth'

export default function SetupWorkspacePage() {
  const router = useRouter()
  const { session, loading, tenants, refetchSession } = useAuthContext()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (loading) return
    if (!session) router.replace('/login')
    else if (tenants.length > 0) router.replace('/dashboard')
  }, [loading, session, tenants.length, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving || !session?.user?.id) return
    setError('')
    setSaving(true)
    try {
      // Locked to the caller and idempotent at the database (migration 037):
      // a double click returns the same workspace rather than a second one.
      await createTenant(session.user.id, name, name)
      await refetchSession()
      router.replace('/dashboard')
      return
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not create your workspace'))
    }
    setSaving(false)
  }

  const aside = (
    <>
      <Eyebrow>Almost there</Eyebrow>
      <AuthHeading lead="Name your" accent="business" />
      <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
        Your login is ready. FieldMS just needs your business name to set up your workspace.
      </p>
    </>
  )

  return (
    <AuthShell nav={{ prompt: 'Wrong account?', label: 'Back to log in', href: '/login', variant: 'outline' }} aside={aside}>
      <div className="card mx-auto w-full max-w-md p-8 shadow-xl sm:p-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Finish setting up</h2>
        <p className="mt-2 text-sm text-slate-500">This is the name your customers see on quotes and invoices.</p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="workspaceName" className="label">Business name</label>
            <input
              id="workspaceName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Electrical"
              required
              maxLength={120}
              className="input"
            />
          </div>
          <button type="submit" disabled={saving || loading} className="btn btn-primary btn-lg w-full">
            {saving ? 'Setting up…' : 'Continue'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
