import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getOrCreateTrackingToken } from '@/lib/tracking'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  const tokenRow = await getOrCreateTrackingToken(jobId)
  const origin = new URL(request.url).origin
  const trackingUrl = `${origin}/track/${tokenRow.token}`

  return NextResponse.json({ token: tokenRow.token, trackingUrl })
}
