'use client'

/* ============================================================
   Verify email: the step between signing up and the app.

   With "Confirm email" on, signUp() returns no session, so this page
   cannot rely on being signed in. It works from the email address
   (passed as ?email= by signup and login) and supports both ways in:

     1. ?token_hash=...&type=email  → the button in the email
     2. a typed six digit code      → survives mail scanners (Outlook and
        Defender open every link to scan it, which uses up a single-use
        link before the person clicks it)

   Either one creates a session, then it's straight to the dashboard
   (which sends a new workspace through setup).
   ============================================================ */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import { createClient } from '@/utils/supabase/client'
import { describeAuthError } from '@/lib/auth'

type Phase = 'checking' | 'enter_code' | 'done'

function VerifyEmailInner() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const prefill = params.get('email')
      if (prefill && !cancelled) setEmail(prefill)

      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
        if (cancelled) return
        if (!error) {
          setPhase('done')
          setTimeout(() => router.replace('/dashboard'), 1200)
          return
        }
        setError('That link has already been used or has expired. Enter the six digit code from the same email instead.')
        setPhase('enter_code')
        return
      }

      // Already confirmed and signed in (an older account, or a second tab).
      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (data.user?.email_confirmed_at) {
        setPhase('done')
        setTimeout(() => router.replace('/dashboard'), 1200)
        return
      }
      if (!prefill && data.user?.email) setEmail(data.user.email)
      setPhase('enter_code')
    }
    run().catch(() => { if (!cancelled) setPhase('enter_code') })
    return () => { cancelled = true }
  }, [router])

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setVerifying(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' })
      if (error) throw error
      setPhase('done')
      setTimeout(() => router.replace('/dashboard'), 1200)
    } catch (err: unknown) {
      setError(describeAuthError(err, 'That code did not work. Check it, or send a new one.'))
    } finally {
      setVerifying(false)
    }
  }

  const resend = async () => {
    setError('')
    setInfo('')
    if (!email.trim()) {
      setError('Enter the email you signed up with first.')
      return
    }
    setResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
      setInfo('A new code is on its way. Use the newest email, older codes stop working.')
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not send a new code'))
    } finally {
      setResending(false)
    }
  }

  const nav = { prompt: 'Already confirmed?', label: 'Log in', href: '/login', variant: 'outline' as const }

  if (phase === 'checking') {
    return (
      <AuthShell nav={nav}>
        <div className="card w-full max-w-md p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
          <p className="mt-4 text-sm text-slate-500">Checking…</p>
        </div>
      </AuthShell>
    )
  }

  if (phase === 'done') {
    return (
      <AuthShell nav={nav}>
        <div className="card w-full max-w-md p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl text-brand-dark">✓</div>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Email confirmed</h2>
          <p className="mt-2 text-sm text-slate-500">Taking you to set up your workspace…</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell nav={nav}>
      <div className="card w-full max-w-md p-8 shadow-xl sm:p-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Confirm your email</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          We sent a six digit code to{' '}
          <span className="font-semibold text-slate-700">{email || 'your email'}</span>. Enter it below, or tap the
          button in the email. Check spam if it hasn&apos;t arrived in a minute.
        </p>

        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {info && <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{info}</div>}

        <form onSubmit={verify} className="mt-8 space-y-5">
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
            <label htmlFor="code" className="label">Six digit code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              autoFocus
              className="input text-center text-2xl font-black tracking-[0.4em]"
            />
          </div>
          <button type="submit" disabled={verifying || !email.trim() || code.length < 6} className="btn btn-primary btn-lg w-full">
            {verifying ? 'Confirming…' : 'Confirm email'}
          </button>
        </form>

        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {resending ? 'Sending…' : 'Send a new code'}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Wrong address?{' '}
          <Link href="/signup" className="font-semibold text-brand-dark transition-colors hover:text-brand">
            Sign up again
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-slate-400">Loading…</p>}>
      <VerifyEmailInner />
    </Suspense>
  )
}
