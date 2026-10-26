import { NextResponse } from 'next/server'
import { runReminders } from '@/lib/reminders'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/cron/reminders — the daily reminder run (see lib/reminders.ts).
 *
 * Called by Vercel Cron (vercel.json), which sends
 * "Authorization: Bearer <CRON_SECRET>" automatically when CRON_SECRET is
 * set in the project. Also accepts x-cron-secret like /api/pricing/refresh.
 * Fails closed: no CRON_SECRET configured means nobody can run it.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const bearer = request.headers.get('authorization')
  const header = request.headers.get('x-cron-secret')
  if (!secret || (bearer !== `Bearer ${secret}` && header !== secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await runReminders()
  return NextResponse.json(result)
}
