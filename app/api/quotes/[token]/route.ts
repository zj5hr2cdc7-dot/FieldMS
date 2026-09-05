import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function getEstimateByToken(token: string) {
  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from('estimates')
    .select('*, estimate_items(id, name, quantity, unit_price, total)')
    .eq('public_token', token)
    .single()
  return estimate
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const estimate = await getEstimateByToken(token)
  if (!estimate) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  const { data: business } = await admin
    .from('tenants')
    .select('name, logo_url, abn, phone, website')
    .eq('id', estimate.business_id)
    .single()

  // Audit: record that the customer opened the quote
  await admin.from('estimate_approval_events').insert({
    estimate_id: estimate.id,
    event_type: 'viewed',
    user_agent: request.headers.get('user-agent'),
  })

  const total = Number(estimate.total)
  const depositPercent = Number(estimate.deposit_percent) || 0

  return NextResponse.json({
    quote: {
      customer_name: estimate.customer_name,
      status: estimate.status,
      total,
      deposit_percent: depositPercent,
      deposit_amount: Math.round(total * depositPercent) / 100,
      approved_at: estimate.approved_at,
      declined_at: estimate.declined_at,
      approval_name: estimate.approval_name,
      created_at: estimate.created_at,
      items: (estimate.estimate_items || []).map((item: { id: string; name: string; quantity: unknown; unit_price: unknown; total: unknown }) => ({
        id: item.id,
        name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        total: Number(item.total),
      })),
    },
    business: business ?? null,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const body = await request.json().catch(() => null)
  const action = body?.action as 'approve' | 'decline' | undefined
  const actorName = typeof body?.name === 'string' ? body.name.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : null

  if (!action || !['approve', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
  if (action === 'approve' && !actorName) {
    return NextResponse.json({ error: 'Please type your name to approve the quote.' }, { status: 400 })
  }

  const estimate = await getEstimateByToken(token)
  if (!estimate) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }
  if (estimate.approved_at || estimate.declined_at) {
    return NextResponse.json({ error: 'This quote has already been responded to.' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const updates =
    action === 'approve'
      ? { status: 'accepted', approved_at: now, approval_name: actorName, approval_note: note }
      : { status: 'declined', declined_at: now, approval_name: actorName || null, approval_note: note }

  const { error } = await admin.from('estimates').update(updates).eq('id', estimate.id)
  if (error) {
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 })
  }

  await admin.from('estimate_approval_events').insert({
    estimate_id: estimate.id,
    event_type: action === 'approve' ? 'approved' : 'declined',
    actor_name: actorName || null,
    note,
    user_agent: request.headers.get('user-agent'),
  })

  // On approval, if this quote is linked to a job, seed the job's billing:
  // set the quoted value (ex GST) and log it on the job billing timeline.
  if (action === 'approve' && estimate.job_id) {
    const total = Number(estimate.total)
    const gstRate = 10
    const quoteExGst = Math.round((total / (1 + gstRate / 100)) * 100) / 100
    await admin.from('jobs').update({ quote_total: quoteExGst }).eq('id', estimate.job_id)
    await admin.from('billing_audit_events').insert({
      tenant_id: estimate.business_id,
      job_id: estimate.job_id,
      event_type: 'quote_approved',
      actor_name: actorName || null,
      amount: total,
      meta: { estimate_id: estimate.id, via: 'customer_portal' },
    })
  }

  return NextResponse.json({ ok: true, status: updates.status })
}
