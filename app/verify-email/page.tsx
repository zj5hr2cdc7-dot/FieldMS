'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/utils/supabase/client'

export default function VerifyEmailPage() {
  const router = useRouter()
  const { session } = useAuthContext()
  const [isVerified, setIsVerified] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        if (data.user?.email_confirmed_at) {
          setIsVerified(true)
          setTimeout(() => router.push('/dashboard'), 2000)
        }
      } catch (error) {
        console.error('Error checking verification:', error)
      } finally {
        setChecking(false)
      }
    }

    checkVerification()
    const interval = setInterval(checkVerification, 3000)
    return () => clearInterval(interval)
  }, [router])

  if (isVerified) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(74,156,74,0.18),transparent)]" />
        <div className="card relative w-full max-w-md p-10 text-center shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-brand-dark">✓</div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-slate-900">Email verified!</h1>
          <p className="mt-3 text-sm text-slate-500">Redirecting to your dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(74,156,74,0.18),transparent)]" />
      <div className="card relative w-full max-w-md p-8 shadow-xl sm:p-10">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Verify your email</h1>
        <p className="mt-3 text-sm text-slate-500">We sent a verification link to {session?.user?.email}</p>

        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
          Check your email and click the verification link to activate your account. We will keep checking automatically.
        </div>

        {checking ? (
          <div className="mt-6 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
            <p className="mt-4 text-sm text-slate-500">Checking verification status…</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4 text-center">
            <p className="text-sm text-slate-500">Still waiting for verification?</p>
            <Link href="/login" className="btn btn-primary">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
