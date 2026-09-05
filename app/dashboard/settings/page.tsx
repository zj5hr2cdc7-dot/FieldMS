'use client'

/**
 * Settings hub.
 *
 * Settings were previously scattered across six routes with no way to tell
 * which ones you were allowed to touch. This is one page, grouped the way
 * ServiceM8 groups Account settings, with everything the current role cannot
 * change shown as locked rather than hidden — so a manager can see that a
 * setting exists and who to ask, instead of wondering why the app behaves
 * differently for the boss.
 */

import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import {
  capabilities,
  normaliseRole,
  roleMeta,
  ROLES,
  CAPABILITY_MATRIX,
  type Role,
} from '@/lib/roles'

interface Item {
  label: string
  description: string
  href: string
  requires: 'owner' | 'office' | 'any'
}

const GROUPS: { title: string; blurb: string; items: Item[] }[] = [
  {
    title: 'Business',
    blurb: 'Who you are, and how you appear on everything you send.',
    items: [
      { label: 'Setup', description: 'Business details, trades, branding, wholesalers and integrations in one run', href: '/dashboard/onboarding', requires: 'owner' },
      { label: 'Workspace', description: 'Name, ABN, contact details and working hours', href: '/dashboard/workspace', requires: 'owner' },
      { label: 'Branding', description: 'Logo, colours and licence numbers on documents', href: '/dashboard/branding', requires: 'owner' },
    ],
  },
  {
    title: 'People',
    blurb: 'Your crew and what each of them can see.',
    items: [
      { label: 'Team', description: 'Invite staff, set roles, remove access', href: '/dashboard/team', requires: 'owner' },
      { label: 'Staff', description: 'Qualifications, licences, vehicles and emergency contacts', href: '/dashboard/staff', requires: 'office' },
    ],
  },
  {
    title: 'Money and materials',
    blurb: 'Pricing, suppliers and where your books live.',
    items: [
      { label: 'Integrations', description: 'Xero and MYOB connections', href: '/dashboard/integrations', requires: 'owner' },
      { label: 'Materials', description: 'Catalogue, wholesaler accounts and price overrides', href: '/dashboard/materials', requires: 'office' },
    ],
  },
  {
    title: 'Your account',
    blurb: 'Just for you, regardless of role.',
    items: [
      { label: 'Profile', description: 'Your name, contact details and password', href: '/dashboard/profile', requires: 'any' },
    ],
  },
]

export default function SettingsPage() {
  const { userRole } = useAuthContext()
  const role = normaliseRole(userRole)
  const caps = capabilities(role)

  const allowed = (requires: Item['requires']) => {
    if (requires === 'any') return true
    if (requires === 'office') return caps.seeAllJobs
    return caps.manageSettings
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 text-slate-500">Everything about how your business runs in FieldMS.</p>

      {/* Current role */}
      <div className="card mt-8 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">You are signed in as</p>
            <p className="mt-1 text-xl font-black text-slate-900">{roleMeta(role).label}</p>
            <p className="mt-1 max-w-xl text-sm text-slate-500">{roleMeta(role).description}</p>
          </div>
          {role !== 'technician' && (
            <Link href="/field" className="btn btn-ghost border border-slate-300">
              Preview the field app
            </Link>
          )}
        </div>
      </div>

      {/* Groups */}
      {GROUPS.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">{group.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{group.blurb}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {group.items.map((item) => {
              const ok = allowed(item.requires)
              if (!ok) {
                return (
                  <div key={item.href} className="card p-5 opacity-60">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-700">{item.label}</p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                        Owner only
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                    <p className="mt-3 text-xs text-slate-400">Ask the business owner to change this.</p>
                  </div>
                )
              }
              return (
                <Link key={item.href} href={item.href} className="card p-5 transition-colors hover:border-brand">
                  <p className="font-bold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {/* What each role gets */}
      <section className="mt-12">
        <h2 className="text-lg font-bold text-slate-900">What each role can do</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Enforced in the database, not just hidden in the app. Assign roles under Team.
        </p>
        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-semibold">Capability</th>
                {ROLES.map((r) => (
                  <th key={r.key} className="px-5 py-3 text-center font-semibold">{r.shortLabel}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CAPABILITY_MATRIX.map((row) => (
                <tr key={row.key} className={row.key === 'seeCostAndProfit' ? 'bg-amber-50/40' : undefined}>
                  <td className="px-5 py-2.5 text-slate-700">
                    {row.label}
                    {row.key === 'seeCostAndProfit' && (
                      <span className="ml-2 text-xs text-amber-700">Owner only</span>
                    )}
                  </td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="px-5 py-2.5 text-center">
                      <Tick on={capabilities(r.key as Role)[row.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Tick({ on }: { on: boolean }) {
  return on ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-4 w-4 text-brand-dark">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ) : (
    <span className="text-slate-300">—</span>
  )
}
