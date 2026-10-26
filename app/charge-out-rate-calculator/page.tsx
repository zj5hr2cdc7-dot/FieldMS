/**
 * Public charge-out rate calculator. The free tool at the top of the funnel.
 *
 * WHY THIS PAGE EXISTS
 *   Undercharging is the thing that quietly kills small trade businesses, and
 *   it is the one mistake a calculator can actually fix. The tool already
 *   existed behind a login, which is exactly the wrong side of the wall: the
 *   people who most need it are the ones who have not signed up.
 *
 * NO EMAIL WALL
 *   The answer appears as you type, for anyone, with no form in front of it.
 *   A tradie who hits "enter your email to see your rate" closes the tab. The
 *   call to action sits under a result they already have.
 *
 * Server component so the copy and the FAQ are in the HTML for crawlers; the
 * calculator itself is a client island. See AUDIT_REPORT.md on why the home
 * page had to stop being 'use client' for the same reason.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'
import PublicRateCalculator from '@/components/marketing/PublicRateCalculator'
import { absoluteUrl } from '@/lib/seo'

const TITLE = 'Charge-Out Rate Calculator for Australian Electricians'
const DESCRIPTION =
  'Work out what to charge per hour. Covers wages, super and on-costs, overheads and the hours that never make it onto an invoice. Free, no sign-up.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/charge-out-rate-calculator') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/charge-out-rate-calculator'),
    type: 'website',
  },
}

/**
 * Questions people actually ask, answered the same way the calculator does.
 * Rendered visibly AND as FAQPage structured data: the text a crawler reads
 * and the text a person reads must be the same, or it is cloaking.
 */
const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is a charge-out rate?',
    a: 'The hourly figure you put on a quote or invoice for labour. It is not what you pay someone. It has to cover their wage, super and on-costs, a share of every overhead the business carries, and a profit margin, spread over only the hours that actually get billed.',
  },
  {
    q: 'Why is the rate so much higher than the wage?',
    a: 'Because a paid hour and a billable hour are not the same thing. Travel between jobs, quoting, picking up materials, chasing invoices and paperwork are all paid but not billed. If roughly 70 percent of paid time ends up on an invoice, every billable hour has to carry the cost of the other 30 percent as well as the van, the insurance, the phone and the accountant.',
  },
  {
    q: 'What share of my time is actually billable?',
    a: 'Most trade businesses land somewhere between 60 and 75 percent. Anything above 85 percent is rare once travel, quoting and admin are counted honestly. If your number looks higher than that, you are probably not counting something.',
  },
  {
    q: 'Does this include GST?',
    a: 'No. Every figure here is ex GST, which is how you should compare rates. The calculator shows the inc GST equivalent underneath so you can see what a customer would be quoted, but only if you are registered for GST. Below the registration threshold you must not add it.',
  },
  {
    q: 'What about materials?',
    a: 'Left out on purpose. Materials carry their own markup and should be priced separately, not buried in an hourly rate. Mixing them hides which part of a job is actually making money.',
  },
  {
    q: 'What profit margin should I aim for?',
    a: 'That is your call and it depends on the work and the risk you are carrying. The important part is that the margin is a deliberate number rather than whatever is left over. Note this is a margin, not a markup: a 20 percent margin means 20 percent of the price is profit.',
  },
]

export default function ChargeOutRateCalculatorPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'FieldMS Charge-Out Rate Calculator',
        url: absoluteUrl('/charge-out-rate-calculator'),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        description: DESCRIPTION,
        // Free, and saying so in the markup rather than only in the copy.
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map(({ q, a }) => ({
          '@type': 'Question',
          name: q,
          acceptedAnswer: { '@type': 'Answer', text: a },
        })),
      },
    ],
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/">
            <Logo size="sm" textColor="text-slate-900" />
          </Link>
          <Link href="/" className="text-sm font-semibold text-brand-dark hover:underline">
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-dark">Free tool</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            What should you actually be charging per hour?
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Most tradies work it out by taking a wage and adding a bit. That number is almost always too low, because
            it forgets the hours that never make it onto an invoice and every cost the business carries between jobs.
          </p>
          <p className="mt-3 leading-7 text-slate-600">
            Change the figures below and the answer updates as you type. No sign-up, no email, nothing to download.
          </p>
        </div>

        <div className="mt-10">
          <PublicRateCalculator />
        </div>

        {/* ── How it works ── */}
        <section className="mt-20 max-w-2xl">
          <h2 className="text-2xl font-black tracking-tight">How the number is worked out</h2>
          <p className="mt-4 leading-7 text-slate-600">
            There is no trick to it, which is why it is worth seeing written down:
          </p>
          <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 font-mono text-sm text-slate-700">
            <p>cost per billable hour = (labour cost + overheads) ÷ billable hours</p>
            <p>charge-out rate = cost per billable hour ÷ (1 − profit margin)</p>
          </div>
          <p className="mt-5 leading-7 text-slate-600">
            The part people miss is the divisor. Costs get spread over billable hours, not paid hours. Drop your
            billable share from 75 percent to 60 and the rate has to rise to cover the same costs, even though nothing
            about your wages or your van changed.
          </p>
          <p className="mt-3 leading-7 text-slate-600">
            All figures are ex GST. Materials sit outside this with their own markup. This is a planning tool, not
            financial advice, so talk to your accountant before you reprice everything.
          </p>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-16 max-w-2xl">
          <h2 className="text-2xl font-black tracking-tight">Questions</h2>
          <dl className="mt-6 space-y-7">
            {FAQS.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-base font-bold text-slate-900">{q}</dt>
                <dd className="mt-2 leading-7 text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Closing CTA ── */}
        <section className="mt-16 rounded-2xl bg-ink px-6 py-12 text-center text-white sm:px-12">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
            A rate only helps if it reaches the invoice.
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-7 text-white/70">
            FieldMS holds your rate and your material prices, so quotes price themselves on site and an approved quote
            becomes a job and then an invoice without anyone re-typing a figure.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-block rounded-lg bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Get started
          </Link>
          <p className="mt-3 text-xs text-white/50">Your whole crew, one price. Cancel any time.</p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} FieldMS</p>
          <div className="flex gap-6">
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-700">Terms</Link>
            <a href="mailto:jack.gapes@outlook.com" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
