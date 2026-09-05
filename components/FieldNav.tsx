'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { canUseFaultFinder, getTradesCached } from '@/lib/onboarding'

const TABS: { href: string; label: string; icon: string }[] = [
  { href: '/field', label: 'Home', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
  { href: '/field/jobs', label: 'Jobs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/field/forms', label: 'Forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { href: '/field/timesheet', label: 'Time', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/field/assistant', label: 'Faults', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
]

export default function FieldNav() {
  const pathname = usePathname()
  const { currentTenant } = useAuthContext()
  const [faultFinder, setFaultFinder] = useState(true)
  const isActive = (href: string) => (href === '/field' ? pathname === '/field' : pathname.startsWith(href))

  // Fault Finder is electrical only, so HVAC crews don't get the tab.
  useEffect(() => {
    if (!currentTenant) return
    getTradesCached(currentTenant.id)
      .then((trades) => setFaultFinder(canUseFaultFinder(trades)))
      .catch(() => setFaultFinder(true))
  }, [currentTenant])

  const tabs = faultFinder ? TABS : TABS.filter((t) => t.href !== '/field/assistant')

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors ${
                active ? 'text-brand-dark' : 'text-slate-400'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={tab.icon} />
              </svg>
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
