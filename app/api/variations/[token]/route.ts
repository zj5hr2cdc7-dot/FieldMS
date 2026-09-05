import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function getVariationByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('job_variations').select('*').eq('public_token', token).single()
  return data
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const variation = await getVariationByToken(token)
  if (!variation) return NextResponse.json({ error: 'Variation not found' }, { status: 404 })

  const [{ data: job }, { data: tenant }, { data: branding }] = await Promise.all([
    admin.from('jobs').select('title, customer_name, customer_address, gst_rate').eq('id', variation.job_id).single(),
    admin.from('tenants').select('name, abn, phone').eq('id', variation.tenant_id).single(),
    admin.from('tenant_branding').select('trading_name, primary_color, secondary_color, font_family, logo_path, footer_text').eq('tenant_id', variation.tenant_id).single(),
  ])

  let logoUrl: string | null = null
  if (branding?.logo_path) {
    const { data: signed } = await admin.storage.from('branding').createSignedUrl(branding.logo_path, 3600)
    logoUrl = signed?.signedUrl ?? null
  }

  const gstRate = Number(job?.gst_rate ?? 10)
  const total = Number(variation.total_ex_gst)

  return NextResponse.json({
    variation: {
      variation_number: variation.variation_number,
      description: variation.description,
      reason: variation.reason,
      total_ex_gst: total,
      gst_amount: Math.round(total * (gstRate / 100) * 100) / 100,
      total_inc_gst: Math.round(total * (1 + gstRate / 100) * 100) / 100,
      status: variation.status,
      approved_by_name: variation.approved_by_name,
      approved_at: variation.approved_at,
      created_at: variation.created_at,
    },
    job: job ? { title: job.title, customer_name: job.customer_name, customer_address: job.customer_address } : null,
    business: tenant ?? null,
    branding: branding ?? null,
    logo_url: logoUrl,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const variation = await getVariationByToken(token)
  if (!variation) return NextResponse.json({ error: 'Variation not found' }, { status: 404 })
  if (['approved', 'rejected', 'completed'].includes(variation.status)) {
    return NextResponse.json({ error: 'This variation has already been responded to.' }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action as 'approve' | 'reject' | undefined
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!action || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Please provide your name.' }, { status: 400 })

  const status = action === 'approve' ? 'approved' : 'rejected'
  const patch: Record<string, unknown> = { status }
  if (action === 'approve') { patch.approved_at = new Date().toISOString(); patch.approved_by_name = name }

  const { error } = await admin.from('job_variations').update(patch).eq('id', variation.id)
  if (error) return NextResponse.json({ error: 'Failed to update variation' }, { status: 500 })

  await admin.from('billing_audit_events').insert({
    tenant_id: variation.tenant_id,
    job_id: variation.job_id,
    event_type: `variation_${status}`,
    actor_name: name,
    amount: Number(variation.total_ex_gst),
    meta: { variation_number: variation.variation_number, via: 'customer_portal' },
  })

  return NextResponse.json({ ok: true, status })
}
