'use client'

/* ============================================================
   Forgot password — request a recovery email.
   ============================================================ */

import { useState } from 'react'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import { sendPasswordReset, describeAuthError } from '@/lib/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendPasswordReset(email.trim())
      // Deliberately the same result whether or not the address is
      // registered, so this page can't be used to probe for accounts.
      setSent(true)
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not send the reset email'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell nav={{ prompt: 'Remembered it?', label: 'Log in', href: '/login', variant: 'outline' }}>
      <div className="card w-full max-w-md p-8 shadow-xl sm:p-10">
        {sent ? (
          <>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-dark">
                <path d="M4 4h16v16H4z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Check your inbox</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              If an account exists for <span className="font-semibold text-slate-700">{email}</span>, a reset
              link is on its way. It expires in an hour.
            </p>
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              Nothing arriving? Check spam, and make sure the address is the one you signed up with.
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              If the link says it has already expired, your mail provider probably opened it first to
              scan it. Use the six digit code in the same email instead.
            </p>
            <Link
              href={`/reset-password?email=${encodeURIComponent(email)}`}
              className="btn btn-primary btn-lg mt-6 block w-full text-center"
            >
              Enter code manually
            </Link>
            <button
              type="button"
              onClick={() => { setSent(false); setError('') }}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Use a different address
            </button>
            <p className="mt-6 text-center text-sm text-slate-500">
              <Link href="/login" className="font-semibold text-brand-dark transition-colors hover:text-brand">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Reset your password</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter the email on your account and we&apos;ll send you a link to set a new password.
            </p>

            {error && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="input"
                />
              </div>
              <button type="submit" disabled={loading || !email.trim()} className="btn btn-primary btn-lg w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-brand-dark transition-colors hover:text-brand">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  )
}
