'use client'

/* ============================================================
   Sign in — "Daylight" styling via the shared AuthShell.
   ============================================================ */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell, { AuthHeading, Eyebrow, Icon, check } from '@/components/AuthShell'
import { signInWithEmail, describeAuthError } from '@/lib/auth'

const HIGHLIGHTS: [string, string][] = [
  // "live material costs" implied a live wholesaler feed, which does not
  // exist — you import your own price lists. Same audit as the homepage.
  ['Quote to invoice in a few taps', 'Build priced quotes from your own material prices.'],
  ['Your crew, in sync', 'Schedules, timesheets and job updates from the field.'],
]

const TRUST = ['Works in switchrooms', 'AS/NZS 3000 aware', 'Built in Australia']

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signInWithEmail(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const aside = (
    <>
      <Eyebrow>Welcome back</Eyebrow>
      <AuthHeading lead="Pick up where you" accent="left off" />
      <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
        Quotes, jobs, invoices, compliance and your crew, all waiting in one workspace.
      </p>
      <ul className="mt-10 space-y-4">
        {HIGHLIGHTS.map(([title, body]) => (
          <li key={title} className="card p-5">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
        {TRUST.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <Icon d={check} className="h-4 w-4 text-brand-dark" /> {t}
          </span>
        ))}
      </div>
    </>
  )

  return (
    <AuthShell nav={{ prompt: 'New to FieldMS?', label: 'Get early access', href: '/signup' }} aside={aside}>
      <div className="card mx-auto w-full max-w-md p-8 shadow-xl sm:p-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Sign in</h2>
        <p className="mt-2 text-sm text-slate-500">Enter your workspace credentials to continue.</p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="password" className="label">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-brand-dark transition-colors hover:text-brand"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-brand-dark transition-colors hover:text-brand">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
