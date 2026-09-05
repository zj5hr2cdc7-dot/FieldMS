'use client'

import { useAuthContext } from '@/context/AuthContext'

export default function WorkspacePage() {
  const { currentTenant, userRole } = useAuthContext()

  const isAdmin = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <div>
        <h1 className="text-3xl font-bold text-slate-900">Workspace settings</h1>
        <p className="text-slate-500 mt-1">Manage workspace details and access controls</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Workspace information</h2>
          <dl className="space-y-4">
            {[
              { label: 'Workspace name', value: currentTenant?.name, mono: false },
              { label: 'Workspace slug', value: currentTenant?.slug, mono: true },
              { label: 'Workspace ID', value: currentTenant?.id, mono: true },
              { label: 'Created', value: currentTenant?.created_at ? new Date(currentTenant.created_at).toLocaleDateString('en-AU') : '—', mono: false },
            ].map(({ label, value, mono }) => (
              <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</dt>
                <dd className={`mt-1 text-sm font-medium text-slate-900 break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
              </div>
            ))}
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Your role</dt>
              <dd className="mt-1">
                <span className="inline-flex rounded-full bg-green-100 px-3 py-0.5 text-xs font-semibold text-green-700 capitalize">
                  {userRole}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {isAdmin && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-2">Admin actions</h2>
            <p className="text-sm text-slate-500 mb-5">Manage your team and workspace features.</p>
            <div className="space-y-3">
              <button disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed">
                Edit workspace settings (coming soon)
              </button>
              <button disabled className="w-full rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-300 cursor-not-allowed">
                Delete workspace (coming soon)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
