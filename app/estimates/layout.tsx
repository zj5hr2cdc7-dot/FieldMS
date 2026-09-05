'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import MobileNav from '@/components/MobileNav'

export default function EstimatesLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, loading } = useAuthContext()

  useEffect(() => {
    if (!loading && !session) {
      router.push('/login')
    }
  }, [session, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-brand" />
          <p className="mt-4 text-sm text-brand-light">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  )
}
