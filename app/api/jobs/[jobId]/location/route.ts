import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { insertLocationUpdate } from '@/lib/tracking'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const lat = typeof body?.lat === 'number' ? body.lat : null
  const lng = typeof body?.lng === 'number' ? body.lng : null
  const accuracy = typeof body?.accuracy === 'number' ? body.accuracy : null

  if (lat === null || lng === null) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('tenant_id')
    .eq('id', jobId)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  const { data: membership } = await admin
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', job.tenant_id)
    .eq('user_id', session.user.id)
    .single()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await insertLocationUpdate(jobId, job.tenant_id, lat, lng, accuracy)

  return NextResponse.json({ ok: true })
}
