'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { normaliseRole, roleMeta } from '@/lib/roles'

export default function WorkspacePage() {
  const router = useRouter()
  const { currentTenant, userRole, refetchSession } = useAuthContext()

  /*
   * normaliseRole, not a raw comparison.
   *
   * This used to read `userRole === 'owner' || userRole === 'admin'`. The
   * 'admin' role has not existed since migration 024 (it is 'manager' now),
   * so for a modern workspace that test was simply `=== 'owner'` with a
   * dead second branch — and an older row still storing 'admin' would be
   * granted owner-level actions it should not have.
   *
   * Deletion is owner-only regardless: a manager runs the office, they do not
   * get to end the business.
   */
  const role = normaliseRole(userRole)
  const isOwner = role === 'owner'

  const [confirmName, setConfirmName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)

  const nameMatches = currentTenant ? confirmName.trim() === currentTenant.name.trim() : false

  async function deleteWorkspace() {
    if (!currentTenant || !nameMatches) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenant.id, confirmName }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Could not delete the workspace')

      // The account this session belongs to may no longer exist.
      await refetchSession().catch(() => {})
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the workspace')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workspace settings</h1>
        <p className="text-slate-500 mt-1">Your workspace details, and how to close it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Workspace information</h2>
          <dl className="space-y-4">
            {[
              { label: 'Workspace name', value: currentTenant?.name, mono: false },
              { label: 'Workspace slug', value: currentTenant?.slug, mono: true },
              { label: 'Workspace ID', value: currentTenant?.id, mono: true },
              {
                label: 'Created',
                value: currentTenant?.created_at
                  ? new Date(currentTenant.created_at).toLocaleDateString('en-AU')
                  : '—',
                mono: false,
              },
            ].map(({ label, value, mono }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</dt>
                <dd className={`mt-1 text-sm font-medium text-slate-900 break-all ${mono ? 'font-mono' : ''}`}>
                  {value || '—'}
                </dd>
              </div>
            ))}
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your role</dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700">
                  {roleMeta(role).label}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {isOwner && (
          <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Close this workspace</h2>
            <p className="mt-2 text-sm text-slate-600">
              This deletes the workspace and everything in it: jobs, customers, quotes, invoices,
              photos, test sheets and certificates. Logins that belong only to this workspace are
              removed too. It cannot be undone.
            </p>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Export first.</p>
              <p className="mt-1">
                Test sheets, certificates and site reports may be evidence you are legally required
                to keep. Once this is done we cannot get them back for you.
              </p>
            </div>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {!armed ? (
              <button
                type="button"
                onClick={() => setArmed(true)}
                className="mt-5 w-full rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Close this workspace
              </button>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">
                    Type <span className="font-bold">{currentTenant?.name}</span> to confirm
                  </span>
                  <input
                    autoFocus
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={deleteWorkspace}
                    disabled={!nameMatches || busy}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
                  >
                    {busy ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setArmed(false); setConfirmName(''); setError(null) }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-slate-400">
              Prefer to keep your data and just stop paying? Cancel your plan on the{' '}
              <Link href="/dashboard/plan" className="underline">
                Plan &amp; payments
              </Link>{' '}
              page instead.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
