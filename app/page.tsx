/* ============================================================
   FieldMS marketing page: "Daylight".
   Light-first, product-forward: split hero, bento feature grid,
   numbered how-it-works, energetic brand green.

   ── WHY THIS IS A SERVER COMPONENT ──────────────────────────
   It used to be 'use client', and it held the entire page behind
   `if (loading) return <spinner/>` while the browser worked out
   whether you were signed in. Auth is only resolved client-side,
   so during the server render `loading` is always true, which
   meant the HTML served to every crawler was one spinning div.
   No h1, no copy, no links to /signup — nothing to index and
   nothing to rank. The two genuinely interactive bits are now
   client islands (MarketingNav, SignedInRedirect) and the copy
   ships in the initial HTML.

   Keep it this way. If you need state here, put it in an island
   rather than adding 'use client' to the top of this file.
   ============================================================ */

import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import Logo from '@/components/Logo'
import MarketingNav from '@/components/marketing/MarketingNav'
import { PLAN_CARDS, GST_LABEL, GST_REGISTERED } from '@/lib/plans-public'
import SignedInRedirect from '@/components/marketing/SignedInRedirect'
import { FAULT_FINDER_ENABLED, ACCOUNTING_SYNC_ENABLED, CUSTOMER_PAYMENTS_ENABLED } from '@/lib/features'

export const metadata: Metadata = {
  // The homepage is the canonical root. Without this, the apex and www
  // versions of the site are two URLs serving identical content and Google
  // has to guess which one to rank.
  alternates: { canonical: '/' },
}

/**
 * Structured data. This is what lets Google show the site as a software
 * product rather than an anonymous page, and it is the same vocabulary the
 * AI answer engines read when deciding what FieldMS actually is.
 *
 * Every claim below has to stay true — `offers: price 0` is accurate only
 * while early access is genuinely free. Revisit it when billing goes in.
 */
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://fieldms.com.au/#organization',
      name: 'FieldMS',
      url: 'https://fieldms.com.au',
      logo: 'https://fieldms.com.au/fieldms-icon.png',
      description:
        'Job management software for Australian electricians. Quoting, scheduling, invoicing and compliance in one platform.',
      areaServed: { '@type': 'Country', name: 'Australia' },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://fieldms.com.au/#website',
      url: 'https://fieldms.com.au',
      name: 'FieldMS',
      publisher: { '@id': 'https://fieldms.com.au/#organization' },
      inLanguage: 'en-AU',
    },
    {
      '@type': 'SoftwareApplication',
      name: 'FieldMS',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Field Service Management',
      operatingSystem: 'Web, iOS, Android',
      url: 'https://fieldms.com.au',
      publisher: { '@id': 'https://fieldms.com.au/#organization' },
      description:
        'Field service management for Australian electricians. Build priced quotes on site, schedule your crew, complete test sheets and certificates against the job, and invoice before you leave the driveway.',
      featureList: [
        'Quoting and estimates',
        'Job scheduling and dispatch',
        'Invoicing and progress claims',
        'Electrical test sheets and certificates',
        'Asset and compliance register',
        'Photo site reports',
      ],
      // Was price:'0' with "Free during early access", which told Google the
      // product was free while Stripe charged for it. Search engines surface
      // this directly in results, so a stale figure here is a public price
      // claim you did not mean to make.
      offers: {
        '@type': 'Offer',
        price: String(PLAN_CARDS[0].monthly),
        priceCurrency: 'AUD',
        availability: 'https://schema.org/InStock',
        description: `From $${PLAN_CARDS[0].monthly} per month ${GST_LABEL}, whole crew included.`,
      },
      // No aggregateRating: inventing review scores is both a manual-action
      // risk with Google and misleading conduct under Australian Consumer Law.
    },
  ],
}

const check = 'M20 6 9 17l-5-5'

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <script
        type="application/ld+json"
        // The content is a literal defined in this file, not user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SignedInRedirect />

      {/* ── NAV: light, bordered, always visible ── */}
      <MarketingNav />

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
              Quoting, scheduling, invoicing and compliance. One platform, shaped by
              what tradies told us other software got wrong.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="rounded-lg bg-brand px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-brand/25 transition-colors hover:bg-brand-dark">
                Get started
              </Link>
              <a href="#how" className="rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-center text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
                See how it works
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Your whole crew, one price', 'Cancel any time', 'Built in Australia'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Icon d={check} className="h-4 w-4 text-brand-dark" /> {t}</span>
              ))}
            </div>
          </div>

          {/* Product mockup: light card stack */}
          <div aria-hidden="true" className="relative">
            <div className="card overflow-hidden shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <p className="text-sm font-bold">Today</p>
                  {/* Says whose screen this is. The revenue and margin figures
                      below are owner-only in the product — a technician never
                      sees them — so labelling the mockup stops it reading as
                      "everyone on the team can see the books". */}
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    <Icon d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8" className="h-3 w-3" />
                    Owner&apos;s view
                  </span>
                </div>
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
            // Flagged features appear here only when their switch is on, so the
            // page cannot advertise something /api refuses to serve. Flip the
            // variable in Vercel and the card appears on the next deploy;
            // nobody has to remember to edit this copy. See lib/features.ts.
            ...(FAULT_FINDER_ENABLED
              ? [['M13 10V3L4 14h7v7l9-11h-7z', 'Fault Finder', 'Describe the fault and get ranked likely causes and the next test to run. Guidance only, you make the call.', 'bg-yellow-50 text-yellow-600']]
              : []),
            ...(ACCOUNTING_SYNC_ENABLED
              ? [['M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', 'Accounting sync', 'Push invoices and payments straight through to Xero or MYOB instead of keying them twice.', 'bg-blue-50 text-blue-600']]
              : []),
            ...(CUSTOMER_PAYMENTS_ENABLED
              ? [['M3 10h18M7 15h1m4 0h1m-7 4h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z', 'Card payments', 'Your customer taps Pay now on the invoice and the money lands in your account.', 'bg-rose-50 text-rose-600']]
              : []),
            ['M8 7V3m8 4V3M3 11h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'Scheduling', 'Plan your crew’s week in seconds. Everyone sees their jobs on their phone.', 'bg-sky-50 text-sky-600'],
            ['M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.6a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 .3.7V19a2 2 0 0 1-2 2z', 'Compliance built in', 'Test sheets and certificates signed on site and sent before you leave.', 'bg-amber-50 text-amber-600'],
            ['M3 9a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 10.07 4h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 18.07 7H19a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'Site reports', 'Photos and notes against the job, sent to your customer as a link they can open on any phone.', 'bg-green-50 text-brand-dark'],
            ['M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', 'Your material prices', 'Set your own prices once and reuse them on every quote, with each change tracked over time.', 'bg-violet-50 text-violet-600'],
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
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Simple setup, start to finish.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              ['1', 'Set up in minutes', 'Answer a few questions and FieldMS tunes itself to your electrical work. HVAC and refrigeration are coming soon.'],
              ['2', 'Make it yours', 'Add your logo and licence number, set your rates and material prices, and build packages for the jobs you quote over and over.'],
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

      {/* ── FOUNDER ──
          Replaces an anonymous "The FieldMS team" quote. A face and a name is
          the thing that separates this from the flood of AI-generated trade
          apps, and "licensed electrician" is the only credential this audience
          actually cares about — so it leads.

          Everything stated here must stay true. No years of experience, no
          licence numbers, no customer counts unless they can be shown. */}
      <section id="about" className="scroll-mt-20 bg-ink py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[auto_1fr] lg:gap-14">
          <div className="mx-auto lg:mx-0">
            <Image
              src="/founder-jack.jpg"
              alt="Jack Gapes, founder of FieldMS"
              width={224}
              height={224}
              priority={false}
              className="h-44 w-44 rounded-2xl object-cover shadow-2xl ring-1 ring-white/10 sm:h-56 sm:w-56"
            />
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-brand-light">
              Who&apos;s behind it
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
              Built by a sparky, not a software company.
            </h2>
            <div className="mt-5 space-y-4 text-lg leading-8 text-slate-300">
              <p>
                I&apos;m Jack. I&apos;m a licensed electrician, seven years in the trade and going
                on eight.
              </p>
              <p>
                In that time the same thing kept coming up through the network. Business owners
                running a different program for every part of the job, and not one that did the
                lot.
              </p>
              <p>
                So that became the goal. Make the day-to-day easier for electrical business owners.
                Fewer hoops between the start of a job and the end of the day, so you can get on with
                keeping food on the table.
              </p>
              <p>
                It&apos;s early, and I would rather hear what&apos;s wrong with it than guess. Email
                me. It comes straight to me, not a support queue.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="font-bold text-white">Jack Gapes</p>
              <a
                href="mailto:jack.gapes@outlook.com"
                className="text-brand-light underline decoration-brand-light/40 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
              >
                jack.gapes@outlook.com
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──
          Prices come from lib/stripe.ts PLANS, which is also what Stripe
          Checkout charges. Hardcoding them here is how a landing page ends up
          advertising a number the checkout does not honour.

          GST: see GST_REGISTERED in lib/stripe.ts. Australian pricing has to
          say which it is, and saying the wrong one is worse than saying
          nothing. Confirm it before this page goes paid. */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">One price, everything included.</h2>
          <p className="mt-4 text-lg text-slate-600">
            No per-user pricing, no feature tiers you have to decode. Your whole crew, all of it, one
            monthly figure.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {PLAN_CARDS.map((plan) => (
            <div
              key={plan.key}
              className={`relative rounded-2xl border bg-white p-7 shadow-sm ${
                plan.highlight ? 'border-brand shadow-lg shadow-brand/10' : 'border-slate-200'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-7 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
                  Early access
                </span>
              )}
              <h3 className="text-lg font-bold">{plan.label}</h3>
              <p className="mt-3">
                <span className="text-4xl font-black tracking-tight">${plan.monthly}</span>
                <span className="text-slate-500"> /month {GST_LABEL}</span>
              </p>
              <p className="mt-2 text-sm text-slate-500">{plan.blurb}</p>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Icon d={check} className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-7 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-brand text-white hover:bg-brand-dark'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
          Cancel any time from your account — no phone call, no retention offer. Your data stays
          exportable whether you are a customer or not.
        </p>
      </section>

      {/* ── CLOSING CTA: green gradient band ── */}
      <section className="px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-14 text-center sm:px-8 sm:py-16">
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Give your evenings back.</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-green-50">
            One price for the whole crew, cancel any time. Just less admin and more time on the tools.
          </p>
          <Link href="/signup" className="mt-8 inline-block rounded-lg bg-white px-7 py-3.5 text-sm font-bold text-brand-dark shadow-lg transition-transform hover:scale-[1.02]">
            Get started
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
            <Link href="/privacy" className="transition-colors hover:text-slate-700">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-slate-700">Terms</Link>
          </div>
          <p>© {new Date().getFullYear()} FieldMS</p>
        </div>
      </footer>
    </div>
  )
}
