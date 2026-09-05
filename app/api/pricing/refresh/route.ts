import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { readyConnectors } from '@/lib/pricing/connectors'
import { refreshSupplier, type RefreshResult } from '@/lib/pricing/engine'

/**
 * POST /api/pricing/refresh
 * Refreshes market pricing from every activated supplier connector.
 * Auth: a signed-in user, OR a scheduler calling with x-cron-secret
 * (set CRON_SECRET and point Vercel Cron / Supabase pg_cron here for the
 * automatic scheduled updates).
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const isCron = Boolean(cronSecret && request.headers.get('x-cron-secret') === cronSecret)

  if (!isCron) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const results: RefreshResult[] = []
  const failures: { supplier: string; error: string }[] = []

  for (const connector of readyConnectors()) {
    try {
      results.push(await refreshSupplier(connector.key))
    } catch (err) {
      failures.push({ supplier: connector.name, error: err instanceof Error ? err.message : 'Refresh failed' })
    }
  }

  return NextResponse.json({ ok: failures.length === 0, results, failures })
}
