'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { normaliseRole, roleMeta } from '@/lib/roles'
import FieldNav from '@/components/FieldNav'

/**
 * Technician (field) app shell. Deliberately minimal and mobile first:
 * only the tools someone needs standing in a switchboard.
 *
 * Owners and managers may open it to preview what their crew sees, and get a
 * banner saying so. Technicians live here permanently. The real boundary is
 * not this component: migration 024 makes invoices, costs, the customer book
 * and other people's jobs unreadable to a technician at the database, so
 * nothing here is load bearing for security.
 */
export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading, currentTenant, userRole } = useAuthContext()
  const role = normaliseRole(userRole)

  useEffect(() => {
    if (!loading && !session) router.push('/login')
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink text-white">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
          <p className="mt-4 text-sm text-brand-light">Loading…</p>
        </div>
      </div>
    )
  }
  if (!session) return null

  const title = pathname === '/field' ? `Hi, ${(session.profile?.full_name || 'there').split(' ')[0]}` : null

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Slim top bar */}
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50">{currentTenant?.name ?? 'FieldMS'}</p>
            {title && <p className="text-lg font-bold leading-tight">{title}</p>}
          </div>
          <Link href="/field/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
            {(session.profile?.full_name || session.user?.email || '?').slice(0, 1).toUpperCase()}
          </Link>
        </div>
      </header>

      {role !== 'technician' && (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-900">
          Previewing the field app as {roleMeta(role).label.toLowerCase()}
          <Link href="/dashboard" className="ml-2 underline">Back to dashboard</Link>
        </div>
      )}
      <main className="mx-auto max-w-lg px-4 pb-24 pt-4">{children}</main>
      <FieldNav />
    </div>
  )
}
