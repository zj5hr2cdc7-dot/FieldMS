'use client'

/* ============================================================
   Create account — "Daylight" styling via the shared AuthShell.
   ============================================================ */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell, { AuthHeading, Eyebrow, Icon, check } from '@/components/AuthShell'
import { signUpWithEmail, createTenant, describeAuthError } from '@/lib/auth'

// "Accounting sync — connect Xero or MYOB" was here. Neither integration is
// built; the credentials are not even set. It was removed from the homepage in
// the claims audit and survived on this page, which is worse, because this is
// the screen someone reads immediately before signing up. See CLAIMS_AUDIT.md.
const HIGHLIGHTS: [string, string][] = [
  ['Fast estimate builder', 'Add services, prices and quantities in seconds.'],
  ['Compliance against the job', 'Test sheets and certificates filed with the work, not in a folder.'],
]

const TRUST = ['Free during early access', 'No card required', 'Built in Australia']

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { user } = await signUpWithEmail(email, password, fullName)

      if (!user) {
        throw new Error('Failed to create user')
      }

      const slug = tenantName.toLowerCase().replace(/\s+/g, '-')
      await createTenant(user.id, tenantName, slug)
      router.push('/verify-email')
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Signup failed'))
    } finally {
      setLoading(false)
    }
  }

  const aside = (
    <>
      <Eyebrow>Get started</Eyebrow>
      <AuthHeading lead="Create your FieldMS" accent="workspace" />
      <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
        Quoting, scheduling, invoicing and compliance in one platform. Free during early access, no card required.
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
    <AuthShell nav={{ prompt: 'Already with us?', label: 'Log in', href: '/login', variant: 'outline' }} aside={aside}>
      <div className="card mx-auto w-full max-w-md p-8 shadow-xl sm:p-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Create your account</h2>
        <p className="mt-2 text-sm text-slate-500">Set up your workspace and get started.</p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="mt-8 space-y-5">
          <div>
            <label htmlFor="fullName" className="label">Full name</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="input"
            />
          </div>
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
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className="input"
            />
          </div>
          <div>
            <label htmlFor="tenantName" className="label">Workspace name</label>
            <input
              id="tenantName"
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="Acme Electrical"
              required
              className="input"
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-brand-dark transition-colors hover:text-brand">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
