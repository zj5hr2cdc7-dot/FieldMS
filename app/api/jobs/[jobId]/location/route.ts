import { NextResponse } from 'next/server'
import { requireJobAccess } from '@/lib/authz'
import { insertLocationUpdate } from '@/lib/tracking'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  // Revalidated session + membership of the job's own tenant. See lib/authz.ts
  // for why this is not getSession().
  const authz = await requireJobAccess(jobId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const body = await request.json()
  const lat = typeof body?.lat === 'number' ? body.lat : null
  const lng = typeof body?.lng === 'number' ? body.lng : null
  const accuracy = typeof body?.accuracy === 'number' ? body.accuracy : null

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }


  await insertLocationUpdate(jobId, authz.tenantId, lat, lng, accuracy)

  return NextResponse.json({ ok: true })
}
