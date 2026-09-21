'use client'

/*
 * Sends an already-signed-in visitor to the app instead of the marketing page.
 *
 * This renders nothing. That is the whole point: the landing page used to hold
 * its entire body back behind `if (loading) return <spinner/>` so that it could
 * make this one decision. Because auth state is only resolved in the browser,
 * `loading` is always true during the server render, so the HTML that went out
 * to every crawler was a spinner and nothing else — no heading, no copy, no
 * links. Google can execute JavaScript and would eventually have seen the real
 * page, but it treats such pages as lower quality and slower to index, and
 * Bing, LinkedIn, Slack and the AI crawlers largely do not execute it at all.
 *
 * Now the page renders in full for everyone and this component quietly moves
 * signed-in humans along afterwards.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'

export default function SignedInRedirect() {
  const router = useRouter()
  const { session, loading, userRole } = useAuthContext()

  useEffect(() => {
    // ?preview=1 keeps the page visible for signed-in users (design review)
    if (window.location.search.includes('preview')) return
    if (!loading && session) router.replace(userRole === 'member' ? '/field' : '/dashboard')
  }, [session, loading, userRole, router])

  return null
}
