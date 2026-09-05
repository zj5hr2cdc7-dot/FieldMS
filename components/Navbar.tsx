'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Link from 'next/link'
import { signOut } from '@/lib/auth'
import Logo from '@/components/Logo'
import { getTradesCached, moduleGate } from '@/lib/onboarding'

// Navigation follows the job lifecycle rather than the feature list:
// what's on today, who it's for, the work itself, and the money.
// Schedule is used daily and was previously buried in More; Plans is
// occasional and moved the other way.
const primaryLinks = [
  { label: 'Today', href: '/dashboard', tour: 'nav-dashboard' },
  { label: 'Schedule', href: '/dashboard/schedule', tour: 'nav-schedule' },
  { label: 'Jobs', href: '/dashboard/jobs', tour: 'nav-jobs' },
  { label: 'Customers', href: '/dashboard/customers', tour: 'nav-customers' },
  { label: 'Money', href: '/dashboard/billing', tour: 'nav-billing' },
]

const moreLinks = [
  // Settings is the hub: Setup, Branding, Integrations, Team, Staff and
  // Workspace all live inside it, gated by role.
  { label: 'Compliance', href: '/dashboard/compliance' },
  { label: 'Settings', href: '/dashboard/settings' },
  { label: 'Materials', href: '/dashboard/materials' },
  { label: 'Forms', href: '/dashboard/forms' },
  { label: 'Test Sheets', href: '/dashboard/test-sheets' },
  { label: 'Site Reports', href: '/dashboard/reports' },
  { label: 'Job Plans', href: '/dashboard/plans' },
  { label: 'Reviews QR', href: '/dashboard/reviews' },
  { label: 'Fault Finder', href: '/dashboard/assistant' },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { session, currentTenant, tenants, switchTenant } = useAuthContext()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const [trades, setTrades] = useState<string[]>([])

  // Trade-based module gating: HVAC-only businesses don't see
  // electrical-only tools, and the assistant is labelled for their trade.
  useEffect(() => {
    if (currentTenant) getTradesCached(currentTenant.id).then(setTrades).catch(() => {})
  }, [currentTenant])
  const gate = moduleGate(trades)
  const visibleMoreLinks = moreLinks
    .filter((l) => !gate.hiddenNavHrefs.includes(l.href))
    .map((l) => ({ ...l, label: gate.navLabelOverrides[l.href] ?? l.label }))

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
      if (workspaceRef.current && !workspaceRef.current.contains(e.target as Node)) setWorkspaceOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (e) {
      console.error('Sign out failed:', e)
    }
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const anyMoreActive = visibleMoreLinks.some((l) => isActive(l.href))

  const linkCls = (active: boolean) =>
    `inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? 'bg-brand text-white'
        : 'text-brand-light hover:text-white hover:bg-white/10'
    }`

  return (
    <nav className="bg-ink border-b border-ink-light sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">

        {/* Logo */}
        <Link href="/dashboard" className="shrink-0 mr-4">
          <Logo size="sm" />
        </Link>

        {/* Primary desktop links */}
        <div className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} data-tour={link.tour} className={linkCls(isActive(link.href))}>
              {link.label}
            </Link>
          ))}

          {/* More dropdown */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen((o) => !o)}
              className={linkCls(anyMoreActive)}
            >
              More
              <svg className="ml-1 h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {moreOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-ink-light bg-ink shadow-lg z-50">
                {visibleMoreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive(link.href)
                        ? 'text-white bg-brand/20'
                        : 'text-brand-light hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0 ml-2">

          {/* Workspace switcher */}
          <div className="relative hidden sm:block" ref={workspaceRef}>
            <button
              onClick={() => { setWorkspaceOpen((o) => !o); setUserOpen(false) }}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/20 transition-colors max-w-[140px]"
            >
              <span className="truncate">{currentTenant?.name || 'Workspace'}</span>
              <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {workspaceOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-ink-light bg-ink shadow-lg z-50">
                <div className="px-4 py-2 text-xs uppercase tracking-widest text-brand-light">Workspaces</div>
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { switchTenant(t.id); setWorkspaceOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      currentTenant?.id === t.id
                        ? 'text-white bg-white/10'
                        : 'text-brand-light hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
                <div className="border-t border-ink-light" />
                <Link
                  href="/dashboard/workspace"
                  onClick={() => setWorkspaceOpen(false)}
                  className="block px-4 py-2.5 text-sm text-brand-light hover:text-white hover:bg-white/10"
                >
                  Manage workspaces
                </Link>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => { setUserOpen((o) => !o); setWorkspaceOpen(false) }}
              data-tour="nav-user"
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2 py-1.5 text-white hover:bg-white/20 transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold">
                {session?.profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <svg className="h-3 w-3 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-ink-light bg-ink shadow-lg z-50">
                <div className="px-4 py-3 border-b border-ink-light">
                  <p className="text-sm font-semibold text-white truncate">{session?.profile?.full_name || 'User'}</p>
                  <p className="text-xs text-brand-light truncate">{session?.user?.email}</p>
                </div>
                <Link href="/dashboard/profile" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-white/10">Profile</Link>
                <Link href="/dashboard/workspace" onClick={() => setUserOpen(false)} className="block px-4 py-2.5 text-sm text-white hover:bg-white/10">Settings</Link>
                <div className="border-t border-ink-light" />
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-brand-light hover:bg-white/10">
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ink-light bg-ink px-4 py-3 space-y-0.5">
          {[...primaryLinks, ...visibleMoreLinks].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-brand text-white'
                  : 'text-brand-light hover:text-white hover:bg-white/10'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-ink-light pt-2 mt-2">
            <button onClick={handleSignOut} className="block w-full text-left px-4 py-2.5 text-sm text-brand-light hover:bg-white/10 rounded-lg">
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
