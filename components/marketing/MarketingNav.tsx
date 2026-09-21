'use client'

/*
 * The marketing nav, split out of app/page.tsx so that the page itself can be a
 * server component.
 *
 * The only reason this needs to be a client component at all is the shadow that
 * appears once you scroll past 10px. That is a nice touch, but it is not worth
 * costing the whole landing page its server-rendered HTML — see the comment at
 * the top of app/page.tsx for what that was doing to search crawlers.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl transition-shadow ${
        scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo size="sm" textColor="text-slate-900" />
        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#features" className="transition-colors hover:text-slate-900">Features</a>
          <a href="#how" className="transition-colors hover:text-slate-900">How it works</a>
          <a href="#pricing" className="transition-colors hover:text-slate-900">Pricing</a>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Log in</Link>
          <Link href="/signup" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark">
            Get early access
          </Link>
        </div>
      </div>
    </nav>
  )
}
