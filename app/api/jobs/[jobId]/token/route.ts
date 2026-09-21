import { NextResponse } from 'next/server'
import { requireJobAccess } from '@/lib/authz'
import { getOrCreateTrackingToken } from '@/lib/tracking'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Revalidated session + membership of the job's own tenant. See lib/authz.ts
  // for why this is not getSession().
  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })


  const tokenRow = await getOrCreateTrackingToken(jobId)
  const origin = new URL(request.url).origin
  const trackingUrl = `${origin}/track/${tokenRow.token}`

  return NextResponse.json({ token: tokenRow.token, trackingUrl })
}
