import Link from 'next/link'
import Logo from '@/components/Logo'

/**
 * Shared chrome for /privacy and /terms.
 *
 * Server component on purpose: these pages are the two a lawyer, a customer
 * and Apple's reviewer all need to be able to read without JavaScript.
 */

/** Bump when either document changes materially, and tell account holders. */
export const LEGAL_LAST_UPDATED = '23 October 2026'

/**
 * Shown at the top of both documents while they are awaiting legal review.
 *
 * It is here, visibly, rather than only in a code comment, because the
 * alternative is presenting an unreviewed document as if a lawyer had settled
 * it. DELETE THIS CONSTANT and its usages once a lawyer has signed the
 * documents off — see LEGAL_REVIEW_REQUIRED.md §A2 and §A3.
 */
export const REVIEW_NOTICE =
  'This document is accurate about how FieldMS works, but it has not yet been reviewed by an ' +
  'Australian lawyer. It is published so you can see exactly what the software does with your ' +
  'data. Nothing in it reduces rights you have under the Australian Consumer Law.'

export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/">
            <Logo size="sm" textColor="text-slate-900" />
          </Link>
          <Link href="/" className="text-sm font-semibold text-brand-dark hover:underline">
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>

        {/*
          Typography is hand-rolled rather than via @tailwindcss/typography,
          which is not a dependency here. Keep the selectors in step if you add
          elements to either document.
        */}
        <div
          className="
            mt-10 space-y-5 text-slate-700
            [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900
            [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900
            [&_p]:leading-7
            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6
            [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6
            [&_li]:leading-7
            [&_a]:text-brand-dark [&_a]:underline [&_a]:underline-offset-2
            [&_strong]:font-semibold [&_strong]:text-slate-900
            [&_hr]:my-10 [&_hr]:border-slate-200
            [&_table]:w-full [&_table]:text-left [&_table]:text-sm
            [&_th]:border-b [&_th]:border-slate-200 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-slate-900
            [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-2 [&_td]:align-top [&_td]:pr-4
          "
        >
          {children}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50/60">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} FieldMS</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-700">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-700">Terms</Link>
            <a href="mailto:jack.gapes@outlook.com" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
