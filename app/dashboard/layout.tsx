'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'
import ProductTour from '@/components/ProductTour'
import { getOnboarding, needsSetup } from '@/lib/onboarding'
import { isOffice, homeFor, normaliseRole } from '@/lib/roles'
import { getAccess, type Access } from '@/lib/trial'
import TrialBanner from '@/components/TrialBanner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading, userRole, currentTenant, tenants } = useAuthContext()

  useEffect(() => {
    if (loading) return
    if (!session) {
      router.push('/login')
    } else if (tenants.length === 0) {
      // Signed in, member of nothing: the workspace was never created.
      // Send them to name it rather than bouncing to the field app, which
      // would wait forever for a tenant.
      router.replace('/setup-workspace')
    } else if (!isOffice(userRole)) {
      // Technicians get the field app, not the management portal. The
      // database enforces the same split: migration 024 makes invoices,
      // costs and the customer book unreadable to them regardless of route.
      router.replace(homeFor(userRole))
    }
  }, [session, loading, userRole, tenants.length, router])

  // Setup is mandatory. Until a workspace is marked completed, every dashboard
  // route bounces the owner back to the wizard: no jobs, no billing, no
  // certificates from a half configured business. Field members are exempt,
  // they cannot configure a workspace and would just be trapped.
  const [setupChecked, setSetupChecked] = useState(false)
  const [setupRequired, setSetupRequired] = useState(false)

  useEffect(() => {
    if (loading || !session || !currentTenant) return
    let cancelled = false

    // Field members cannot configure a workspace, so the gate never applies to
    // them. Deferred rather than set synchronously to avoid a cascading render.
    if (!isOffice(userRole)) {
      queueMicrotask(() => { if (!cancelled) setSetupChecked(true) })
      return () => { cancelled = true }
    }

    getOnboarding(currentTenant.id)
      .then((state) => {
        if (cancelled) return
        const required = needsSetup(state)
        setSetupRequired(required)
        setSetupChecked(true)
        if (required && pathname !== '/dashboard/onboarding') {
          router.replace('/dashboard/onboarding')
        }
      })
      .catch(() => {
        // Never lock someone out because the check itself failed.
        if (!cancelled) setSetupChecked(true)
      })
    return () => { cancelled = true }
  }, [loading, session, currentTenant, userRole, pathname, router])

  // Free trial (migration 040). Once it is over with no plan, the owner is
  // held on the plan page and everyone else sees /trial-ended. Their data is
  // untouched. A failed check never locks anyone out.
  const [access, setAccess] = useState<Access | null>(null)
  useEffect(() => {
    if (loading || !session || !currentTenant) return
    let cancelled = false
    getAccess(currentTenant.id).then((a) => { if (!cancelled) setAccess(a) })
    return () => { cancelled = true }
  }, [loading, session, currentTenant])

  const isOwner = normaliseRole(userRole) === 'owner'
  const trialOver = access?.status === 'expired'
  useEffect(() => {
    if (!trialOver) return
    // An owner who never finished setup finishes it first (the setup gate
    // sends them there), then lands here; the two never bounce each other.
    if (isOwner && pathname !== '/dashboard/plan' && pathname !== '/dashboard/onboarding') {
      router.replace('/dashboard/plan?trial=ended')
    }
    else if (!isOwner) router.replace('/trial-ended')
  }, [trialOver, isOwner, pathname, router])

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

  if (!session) {
    return null
  }

  // Avoid flashing a protected page for the moment before the redirect lands.
  const gateHolding =
    (!setupChecked || setupRequired) && pathname !== '/dashboard/onboarding'
  if (gateHolding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <TrialBanner access={access} isOwner={isOwner} />
      <main className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</main>
      <MobileNav />
      <ProductTour />
    </div>
  )
}
