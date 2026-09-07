'use client'

/* ============================================================
   FieldMS marketing page: "Daylight".
   Light-first, product-forward: split hero, bento feature grid,
   numbered how-it-works, energetic brand green.
   ============================================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import Logo from '@/components/Logo'

const check = 'M20 6 9 17l-5-5'

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  )
}

export default function Home() {
  const router = useRouter()
  const { session, loading, userRole } = useAuthContext()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // ?preview=1 keeps the page visible for signed-in users (design review)
    if (window.location.search.includes('preview')) return
    if (!loading && session) router.push(userRole === 'member' ? '/field' : '/dashboard')
  }, [session, loading, userRole, router])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ── NAV: light, bordered, always visible ── */}
      <nav className={`sticky top-0 z-50 border-b bg-white/90 backdrop-blur-xl transition-shadow ${scrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`}>
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

      {/* ── HERO: split layout on light, green energy ── */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[480px] w-[480px] rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute top-40 left-[-15%] h-[380px] w-[380px] rounded-full bg-sky-100 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pt-24 lg:pb-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3.5 py-1.5 text-xs font-bold text-brand-dark ring-1 ring-green-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" /> Built with Australian electricians
            </span>
            <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Spend less time managing paperwork.{' '}
              <span className="relative whitespace-nowrap text-brand-dark">
                More time
                <svg aria-hidden="true" viewBox="0 0 300 12" className="absolute -bottom-1 left-0 w-full fill-brand/30"><path d="M2 9c60-5 190-7 296-4l-1 5C192 7 62 8 3 12z" /></svg>
              </span>{' '}
              growing your business.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
              Quoting, scheduling, invoicing, compliance and an AI offsider. One platform, shaped by
              what tradies told us other software got wrong.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-lg bg-brand px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark">
                Get early access
              </Link>
              <a href="#how" className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Free during early access', 'No card required', 'Built in Australia'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Icon d={check} className="h-4 w-4 text-brand-dark" /> {t}</span>
              ))}
            </div>
          </div>

          {/* Product mockup: light card stack */}
          <div aria-hidden="true" className="relative">
            <div className="card overflow-hidden shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <p className="text-sm font-bold">Today</p>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-brand-dark">6 jobs</span>
              </div>
              <div className="grid grid-cols-3 gap-3 px-5 pt-4">
                {[['Revenue', '$248.9k'], ['Open jobs', '14'], ['Awaiting pay', '$32.1k']].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</p>
                    <p className="mt-1 text-lg font-black">{v}</p>
                  </div>
                ))}
              </div>
              <div className="p-5">
                {[['07:30', 'Switchboard upgrade · Acme Corp', 'bg-brand'], ['10:00', 'RCD testing · 14 King St', 'bg-sky-500'], ['13:30', 'EV charger · Bright Homes', 'bg-amber-500']].map(([t, j, c], i) => (
                  <div key={j} className={`flex items-center gap-3 py-2.5 ${i ? 'border-t border-slate-100' : ''}`}>
                    <span className="font-mono text-xs text-slate-400">{t}</span>
                    <span className={`h-2 w-2 rounded-full ${c}`} />
                    <span className="truncate text-sm text-slate-700">{j}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card absolute -bottom-8 -left-4 w-56 p-4 shadow-lg sm:-left-10">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quote #2041</p>
              <p className="mt-1 text-sm font-bold">Acme Corp · $2,860</p>
              <span className="mt-2 inline-block rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-brand-dark">✓ Approved by customer</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section className="border-y border-slate-100 bg-slate-50/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 text-sm font-medium text-slate-400 sm:px-6">
          <span>Built with sparkies across Australia</span>
          <span className="hidden sm:inline">·</span>
          <span>AS/NZS 3000 aware</span>
          <span className="hidden sm:inline">·</span>
          <span>Works in switchrooms</span>
          <span className="hidden sm:inline">·</span>
          <span>HVAC &amp; refrigeration coming soon</span>
        </div>
      </section>

      {/* ── FEATURES: bento grid ── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-dark">Everything in one place</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">One platform for the whole job.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">From first quote to final invoice, with no more juggling a dozen apps and a glovebox full of paper.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Large card */}
          <div className="card p-6 transition-shadow hover:shadow-lg sm:col-span-2 sm:row-span-2 lg:col-span-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white"><Icon d="M13 10V3L4 14h7v7l9-11h-7z" /></div>
            <h3 className="mt-4 text-xl font-bold">Quote to invoice in a few taps</h3>
            <p className="mt-2 max-w-md leading-7 text-slate-600">
              Build priced quotes on site from your own material prices. The customer approves with one tap,
              it becomes a job, then an invoice. No phone calls, no chasing, no double entry.
            </p>
            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
              {[['Switchboard upgrade', '$1,850'], ['2.5mm² TPS cable · 60m', '$111'], ['Labour · 6 hrs', '$540']].map(([a, b], i) => (
                <div key={a} className={`flex items-center justify-between py-2 text-sm ${i ? 'border-t border-slate-200/70' : ''}`}>
                  <span className="text-slate-600">{a}</span><span className="font-bold">{b}</span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-ink px-3.5 py-2.5 text-sm text-white">
                <span>Total inc GST</span><span className="font-black">$2,860.00</span>
              </div>
            </div>
          </div>

          {[
            ['M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'Scheduling', 'Plan your crew’s week in seconds. Everyone sees their jobs on their phone.', 'bg-sky-50 text-sky-600'],
            ['M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z', 'Compliance built in', 'Test sheets and certificates signed on site and sent before you leave.', 'bg-amber-50 text-amber-600'],
            ['M12 8V4H8m8 0h-4v4m-4 4v4h4m4 0h-4v-4M4 20h16', 'Fault Finder', 'An AI offsider for electricians, trained on the fault finding process and the rules you work to.', 'bg-green-50 text-brand-dark'],
            ['M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', 'Your material prices', 'Import your wholesaler price lists and see every price change over time.', 'bg-violet-50 text-violet-600'],
            ['M5 12.55a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0M12 20h.01', 'Built for switchrooms', 'No signal? Mark jobs done anyway. It syncs the moment you are back in range.', 'bg-slate-100 text-slate-600'],
          ].map(([d, title, body, tint]) => (
            <div key={title} className="card p-6 transition-shadow hover:shadow-lg">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}><Icon d={d} /></div>
              <h3 className="mt-4 text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS: numbered steps ── */}
      <section id="how" className="scroll-mt-20 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-brand-dark">How it works</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Up and running before smoko.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Set up in minutes', 'Answer a few questions and FieldMS tunes itself to your electrical work. HVAC and refrigeration are coming soon.'],
              ['2', 'Connect your world', 'Bring in your wholesaler pricing, and push invoices to Xero to keep the books clean.'],
              ['3', 'Run the day from your phone', 'Quote on site, schedule the crew, capture signatures and invoice before you leave the driveway.'],
            ].map(([n, title, body]) => (
              <div key={n} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-black text-white">{n}</span>
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE BAND ── */}
      <section className="bg-ink py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-2xl font-bold leading-relaxed text-white sm:text-3xl">
            “We didn&apos;t start with features. We started by asking tradies what they{' '}
            <span className="text-brand-light">hated</span> about the software they already used.”
          </p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-widest text-slate-400">The FieldMS team</p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
        {/*
          No prices here on purpose. There is no payment processor connected and
          no billing or trial mechanism in the product, so advertising specific
          plan prices, a discount and a "14 day free trial" described something
          we cannot actually deliver or charge for — misleading conduct under
          the Australian Consumer Law. Early access is the truth, and it is a
          better offer anyway. Put the plans back when billing is real.
        */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Free while we build it with you.</h2>
          <p className="mt-4 text-lg text-slate-600">
            FieldMS is in early access with a small group of Australian electricians. It is free to use
            during early access, there is nothing to pay and no card to enter.
          </p>
          <p className="mt-4 text-slate-600">
            When we introduce paid plans we will tell early access users first, well before anything is
            charged, and you will be able to export your data or walk away.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-lg bg-brand px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark"
          >
            Get early access
          </Link>
        </div>
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {[
            { name: 'Quote to invoice', features: ['Priced quotes on site', 'Customer approves with one tap', 'Jobs, then invoices'] },
            { name: 'Compliance', features: ['Test sheets against the job', 'Certificates you can hand over', 'Asset & compliance register'] },
            { name: 'Your crew', features: ['Scheduling and timesheets', 'Field app for technicians', 'FieldMS Fault Finder'] },
          ].map((p) => (
            <div key={p.name} className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-lg">
              <h3 className="text-lg font-bold">{p.name}</h3>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Icon d={check} className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CLOSING CTA: green gradient band ── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-14 text-center sm:px-8 sm:py-16">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Give your evenings back.</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-green-50">
            Free while we are in early access. No card, no contracts. Just less admin and more time on the tools.
          </p>
          <Link href="/signup" className="mt-8 inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-brand-dark shadow-lg transition-transform hover:scale-[1.02]">
            Get early access
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo size="sm" textColor="text-slate-700" />
          <div className="flex gap-6">
            <a href="#pricing" className="transition-colors hover:text-slate-700">Pricing</a>
            <Link href="/login" className="transition-colors hover:text-slate-700">Log in</Link>
            <a href="#" className="transition-colors hover:text-slate-700">Privacy</a>
          </div>
          <p>© {new Date().getFullYear()} FieldMS</p>
        </div>
      </footer>
    </div>
  )
}
