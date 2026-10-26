import { NextResponse } from 'next/server'
import { runScheduledPriceRefresh } from '@/lib/pricing/scheduled-refresh'

export const runtime = 'nodejs'
// Pricing touches every connector and every linked trade account, so it needs
// considerably longer than the default. 60s is the Vercel ceiling on the plans
// below Enterprise; if a real wholesaler feed ever pushes past it, the fix is
// to page through suppliers across runs rather than raise this.
export const maxDuration = 60

/**
 * GET /api/cron/pricing — the scheduled wholesaler price refresh.
 *
 * Called by Vercel Cron (see vercel.json), which sends
 * "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is set
 * on the project. Also accepts x-cron-secret, matching /api/cron/reminders and
 * /api/pricing/refresh.
 *
 * Fails closed: with no CRON_SECRET configured nobody can run it, including
 * the scheduler. That is deliberate — this endpoint writes to the shared
 * product catalogue for every tenant, so an open version of it would let
 * anyone move every business's material prices.
 *
 * The work itself is in lib/pricing/scheduled-refresh.ts; see the comment at
 * the top of that file for why this is worth scheduling before the wholesaler
 * feeds exist.
 *
 * SCHEDULE: "0 16 * * 0-4" in vercel.json.
 *   Vercel cron expressions are UTC. Australian eastern time is UTC+10 (+11 in
 *   daylight saving), so 16:00 UTC is 02:00 the NEXT morning in Brisbane. Days
 *   0-4 (Sun-Thu) UTC therefore land on Mon-Fri AEST: fresh prices waiting
 *   every weekday before anyone starts quoting, and nothing running mid-job.
 *
 *   Writing it as 1-5 would have been the easy mistake — that reads as
 *   "weekdays" but actually produces Tue-Sat in Australia, missing Monday
 *   morning entirely and running once over the weekend.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const bearer = request.headers.get('authorization')
  const header = request.headers.get('x-cron-secret')

  if (!secret || (bearer !== `Bearer ${secret}` && header !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const summary = await runScheduledPriceRefresh()

  // 200 even when individual suppliers failed: the run completed and the
  // detail is in the body. A non-2xx here would make Vercel retry the whole
  // thing, re-importing every catalogue to fix one broken supplier.
  if (!summary.ok) {
    console.error('Scheduled price refresh finished with failures:', {
      market: summary.market.failures,
      trade: summary.trade.failures,
    })
  }

  return NextResponse.json(summary)
}
