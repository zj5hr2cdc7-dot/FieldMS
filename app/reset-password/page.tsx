'use client'

/* ============================================================
   Reset password — landing page for the recovery email.

   Supabase can hand us a recovery session four different ways, and mail
   scanners break the most common one, so all four are supported:

     1. ?token_hash=&type=recovery  → verifyOtp, works cross device
     2. ?code=                      → PKCE exchange, same browser only
     3. #access_token fragment      → picked up by detectSessionInUrl
     4. a typed six digit code      → the fallback that survives scanners

   Why the fallback matters: Outlook and Microsoft Defender Safe Links
   pre-fetch every link in an incoming email to virus check it. Supabase
   recovery tokens are single use, so that automated fetch burns the token
   and the real click arrives to an already consumed link. It looks exactly
   like "the link expired instantly". A code the user types cannot be
   consumed by a scanner.
   ============================================================ */

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import {
  updatePassword,
  verifyRecoveryLink,
  verifyRecoveryCode,
  describeAuthError,
} from '@/lib/auth'
import { createClient } from '@/utils/supabase/client'

type Phase = 'checking' | 'ready' | 'needs_code' | 'done'

const MIN_LENGTH = 8

function ResetPasswordInner() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('checking')
  const [linkFailed, setLinkFailed] = useState(false)

  // Code fallback
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  // New password
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const establish = async () => {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const tokenHash = params.get('token_hash')
      const codeParam = params.get('code')
      const errorDescription = params.get('error_description')
      const prefillEmail = params.get('email')

      if (prefillEmail && !cancelled) setEmail(prefillEmail)

      const settle = (ok: boolean, failedLink: boolean) => {
        if (cancelled) return
        if (ok) {
          window.history.replaceState({}, '', '/reset-password')
          setPhase('ready')
        } else {
          setLinkFailed(failedLink)
          setPhase('needs_code')
        }
      }

      if (errorDescription) {
        settle(false, true)
        return
      }

      // A token in the URL is always authoritative. Never fall back to an
      // existing session here: the browser may be signed in as someone else,
      // and silently letting them past would change the wrong account's
      // password. Only a valid token proves who this recovery is for.
      if (tokenHash) {
        try {
          await verifyRecoveryLink(tokenHash)
          settle(true, false)
        } catch {
          settle(false, true)
        }
        return
      }

      if (codeParam) {
        const { error } = await supabase.auth.exchangeCodeForSession(codeParam)
        settle(!error, Boolean(error))
        return
      }

      // No token at all: either an already signed in user deliberately
      // changing their password, or someone who needs to type their code.
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setPhase('ready')
      } else {
        setLinkFailed(false)
        setPhase('needs_code')
      }
    }

    establish().catch(() => {
      if (!cancelled) { setLinkFailed(true); setPhase('needs_code') }
    })

    return () => { cancelled = true }
  }, [])

  const handleVerifyCode = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)
    try {
      await verifyRecoveryCode(email.trim(), code.trim())
      setPhase('ready')
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not verify that code'))
    } finally {
      setVerifying(false)
    }
  }, [email, code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Those two passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await updatePassword(password)
      setPhase('done')
      setTimeout(() => router.push('/dashboard'), 1800)
    } catch (err: unknown) {
      setError(describeAuthError(err, 'Could not update your password'))
    } finally {
      setLoading(false)
    }
  }

  const nav = { prompt: 'Know your password?', label: 'Log in', href: '/login', variant: 'outline' as const }

  if (phase === 'checking') {
    return (
      <AuthShell nav={nav}>
        <div className="card w-full max-w-md p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
          <p className="mt-4 text-sm text-slate-500">Checking your reset link…</p>
        </div>
      </AuthShell>
    )
  }

  // ── Code fallback ────────────────────────────────────────
  if (phase === 'needs_code') {
    return (
      <AuthShell nav={nav}>
        <div className="card w-full max-w-md p-8 shadow-xl sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-amber-600">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">
            {linkFailed ? 'That link was already used' : 'Enter your reset code'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {linkFailed
              ? 'Email security scanners often open links before you do, which uses up a single use reset link. Use the six digit code from the same email instead, it cannot be consumed that way.'
              : 'Enter the email on your account and the six digit code from your reset email.'}
          </p>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="mt-8 space-y-5">
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
                className="input text-center text-2xl font-black tracking-[0.4em]"
              />
            </div>
            <button
              type="submit"
              disabled={verifying || !email.trim() || code.length < 6}
              className="btn btn-primary btn-lg w-full"
            >
              {verifying ? 'Verifying…' : 'Verify code'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/forgot-password" className="font-semibold text-brand-dark transition-colors hover:text-brand">
              Send a new email
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  if (phase === 'done') {
    return (
      <AuthShell nav={nav}>
        <div className="card w-full max-w-md p-8 shadow-xl sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-brand-dark">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Password updated</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            You&apos;re signed in. Taking you to your dashboard.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-lg mt-6 block w-full text-center">
            Go to dashboard
          </Link>
        </div>
      </AuthShell>
    )
  }

  // ── New password ─────────────────────────────────────────
  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm

  return (
    <AuthShell nav={nav}>
      <div className="card w-full max-w-md p-8 shadow-xl sm:p-10">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Choose a new password</h2>
        <p className="mt-2 text-sm text-slate-500">
          {`At least ${MIN_LENGTH} characters.`}{' '}You&apos;ll be signed in straight after.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="label">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={MIN_LENGTH}
              autoFocus
              className="input"
            />
            {tooShort && <p className="mt-1.5 text-xs text-red-600">{`Use at least ${MIN_LENGTH} characters.`}</p>}
          </div>
          <div>
            <label htmlFor="confirm" className="label">Confirm password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              className="input"
            />
            {mismatch && <p className="mt-1.5 text-xs text-red-600">Those two passwords do not match.</p>}
          </div>
          <button
            type="submit"
            disabled={loading || !password || !confirm}
            className="btn btn-primary btn-lg w-full"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="py-20 text-center text-slate-400">Loading…</p>}>
      <ResetPasswordInner />
    </Suspense>
  )
}
