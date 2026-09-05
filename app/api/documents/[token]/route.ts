import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function getSubmissionByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin.from('form_submissions').select('*').eq('public_token', token).single()
  return data
}

/** GET — customer portal: fetch document + branding + signatures. Logs a 'viewed' audit event. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const submission = await getSubmissionByToken(token)
  if (!submission) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const [{ data: tenant }, { data: branding }, { data: signatures }, { data: job }] = await Promise.all([
    admin.from('tenants').select('name, logo_url, abn, phone, website').eq('id', submission.tenant_id).single(),
    admin.from('tenant_branding').select('*').eq('tenant_id', submission.tenant_id).single(),
    admin.from('form_signatures').select('role, signer_name, signature_data, signed_at').eq('submission_id', submission.id),
    submission.job_id
      ? admin.from('jobs').select('title, customer_name, customer_address').eq('id', submission.job_id).single()
      : Promise.resolve({ data: null }),
  ])

  let logoUrl: string | null = null
  if (branding?.logo_path) {
    const { data: signed } = await admin.storage.from('branding').createSignedUrl(branding.logo_path, 3600)
    logoUrl = signed?.signedUrl ?? null
  }
  let watermarkUrl: string | null = null
  if (branding?.watermark_path && branding?.show_watermark) {
    const { data: signed } = await admin.storage.from('branding').createSignedUrl(branding.watermark_path, 3600)
    watermarkUrl = signed?.signedUrl ?? null
  }

  await admin.from('form_audit_events').insert({
    submission_id: submission.id,
    tenant_id: submission.tenant_id,
    event_type: 'viewed',
    meta: { via: 'customer_portal' },
  })

  return NextResponse.json({
    document: {
      template_name: submission.template_name,
      template_schema: submission.template_schema,
      data: submission.data,
      status: submission.status,
      doc_number: submission.doc_number,
      revision: submission.revision,
      created_at: submission.created_at,
      completed_at: submission.completed_at,
      gps_lat: submission.gps_lat,
      gps_lng: submission.gps_lng,
    },
    job,
    business: tenant ?? null,
    branding: branding
      ? {
          trading_name: branding.trading_name,
          license_number: branding.license_number,
          electrical_license: branding.electrical_license,
          business_address: branding.business_address,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color,
          font_family: branding.font_family,
          logo_position: branding.logo_position,
          footer_text: branding.footer_text,
          show_page_numbers: branding.show_page_numbers,
          acn: branding.acn,
        }
      : null,
    logo_url: logoUrl,
    watermark_url: watermarkUrl,
    signatures: signatures ?? [],
  })
}

/** POST — customer actions: sign an outstanding role, approve work, reject work. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const submission = await getSubmissionByToken(token)
  if (!submission) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const action = body?.action as 'sign' | 'approve' | 'reject' | undefined
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : null
  const userAgent = request.headers.get('user-agent')

  if (action === 'sign') {
    const role = body?.role as string
    const signatureData = body?.signature_data as string
    const customerRoles = ['customer', 'property_owner', 'site_manager']
    if (!customerRoles.includes(role)) {
      return NextResponse.json({ error: 'This signature role cannot be signed from the portal.' }, { status: 403 })
    }
    if (!name || !signatureData?.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Name and signature are required.' }, { status: 400 })
    }
    const { error } = await admin.from('form_signatures').upsert(
      {
        submission_id: submission.id,
        tenant_id: submission.tenant_id,
        role,
        signer_name: name,
        signature_data: signatureData,
        user_agent: userAgent,
      },
      { onConflict: 'submission_id,role' }
    )
    if (error) return NextResponse.json({ error: 'Failed to save signature' }, { status: 500 })

    await admin.from('form_audit_events').insert({
      submission_id: submission.id,
      tenant_id: submission.tenant_id,
      event_type: 'signed',
      actor_name: name,
      meta: { role, via: 'customer_portal' },
    })
    return NextResponse.json({ ok: true })
  }

  if (action === 'approve' || action === 'reject') {
    if (!['completed', 'awaiting_signature'].includes(submission.status)) {
      return NextResponse.json({ error: 'This document is not awaiting a response.' }, { status: 409 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Please provide your name.' }, { status: 400 })
    }
    const status = action === 'approve' ? 'approved' : 'rejected'
    const { error } = await admin.from('form_submissions').update({ status }).eq('id', submission.id)
    if (error) return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })

    await admin.from('form_audit_events').insert({
      submission_id: submission.id,
      tenant_id: submission.tenant_id,
      event_type: status,
      actor_name: name,
      meta: { note, via: 'customer_portal' },
    })
    return NextResponse.json({ ok: true, status })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
