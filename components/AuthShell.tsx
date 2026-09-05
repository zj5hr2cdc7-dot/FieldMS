'use client'

/**
 * Shared chrome for the auth pages (login, signup, forgot, reset).
 *
 * Matches the "Daylight" marketing page: white ground, bordered sticky nav,
 * brand green and sky blur blobs, the same footer. Pass an `aside` to get the
 * split hero layout; leave it out and the card centres on its own.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import Logo from '@/components/Logo'

export const check = 'M20 6 9 17l-5-5'

export function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  )
}

/** Eyebrow pill, same treatment as the marketing hero badge. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5 py-1.5 text-xs font-bold text-brand-dark ring-1 ring-green-200">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> {children}
    </span>
  )
}

/** Headline with the hand-drawn underline under the trailing phrase. */
export function AuthHeading({ lead, accent }: { lead: string; accent: string }) {
  return (
    <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight lg:text-5xl">
      {lead}{' '}
      <span className="relative whitespace-nowrap text-brand-dark">
        {accent}
        <svg aria-hidden="true" viewBox="0 0 300 12" className="absolute -bottom-1 left-0 w-full fill-brand/30">
          <path d="M2 9c60-5 190-7 296-4l-1 5C192 7 62 8 3 12z" />
        </svg>
      </span>
      .
    </h1>
  )
}

interface AuthShellProps {
  /** Right hand nav action. */
  nav: { prompt: string; label: string; href: string; variant?: 'solid' | 'outline' }
  /** Optional story panel. Omit for a single centred card. */
  aside?: ReactNode
  children: ReactNode
}

export default function AuthShell({ nav, aside, children }: AuthShellProps) {
  const navClass =
    nav.variant === 'outline'
      ? 'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50'
      : 'rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark'

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="inline-flex w-fit">
            <Logo size="sm" textColor="text-slate-900" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:block">{nav.prompt}</span>
            <Link href={nav.href} className={navClass}>{nav.label}</Link>
          </div>
        </div>
      </nav>

      <main className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute top-40 left-[-15%] h-[380px] w-[380px] rounded-full bg-sky-100 blur-3xl" />

        {aside ? (
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-20">
            <div className="hidden lg:block">{aside}</div>
            {children}
          </div>
        ) : (
          <div className="relative mx-auto flex max-w-6xl items-center justify-center px-4 py-16 sm:px-6 lg:py-24">
            {children}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo size="sm" textColor="text-slate-700" />
          <div className="flex gap-6">
            <Link href="/#pricing" className="transition-colors hover:text-slate-700">Pricing</Link>
            <Link href="/login" className="transition-colors hover:text-slate-700">Log in</Link>
            <Link href="/" className="transition-colors hover:text-slate-700">Home</Link>
          </div>
          <p>© {new Date().getFullYear()} FieldMS</p>
        </div>
      </footer>
    </div>
  )
}
