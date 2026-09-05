import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: report } = await admin
    .from('job_reports')
    .select('*')
    .eq('token', token)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  const [{ data: job }, { data: business }] = await Promise.all([
    admin.from('jobs').select('title, customer_name, customer_address').eq('id', report.job_id).single(),
    admin.from('tenants').select('name, logo_url, abn, phone, website').eq('id', report.tenant_id).single(),
  ])

  const { data: photos } = await admin
    .from('job_photos')
    .select('id, file_path, caption, taken_at')
    .in('id', report.photo_ids?.length ? report.photo_ids : ['00000000-0000-0000-0000-000000000000'])
    .order('taken_at', { ascending: true })

  const photoUrls: { caption: string | null; taken_at: string; url: string }[] = []
  for (const photo of photos || []) {
    const { data: signed } = await admin.storage
      .from('job-photos')
      .createSignedUrl(photo.file_path, 60 * 60 * 24 * 7)
    if (signed?.signedUrl) {
      photoUrls.push({ caption: photo.caption, taken_at: photo.taken_at, url: signed.signedUrl })
    }
  }

  return NextResponse.json({
    report: { title: report.title, summary: report.summary, created_at: report.created_at },
    job: job ?? null,
    business: business ?? null,
    photos: photoUrls,
  })
}
