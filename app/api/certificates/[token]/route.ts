import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getAS3000ClauseForJob } from '@/lib/as3000'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: sheet } = await admin
    .from('job_test_sheets')
    .select('*')
    .eq('certificate_token', token)
    .eq('status', 'completed')
    .single()

  if (!sheet) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
  }

  const [{ data: job }, { data: tenant }] = await Promise.all([
    admin.from('jobs').select('id, title, description, customer_name, customer_address').eq('id', sheet.job_id).single(),
    admin.from('tenants').select('name, logo_url, abn, phone, website').eq('id', sheet.tenant_id).single(),
  ])

  // Signed URLs for any job photos attached to this job (embedded evidence)
  const { data: photos } = await admin
    .from('job_photos')
    .select('id, file_path, caption, taken_at')
    .eq('job_id', sheet.job_id)
    .order('taken_at', { ascending: true })

  const photoUrls: { caption: string | null; url: string }[] = []
  for (const photo of photos || []) {
    const { data: signed } = await admin.storage
      .from('job-photos')
      .createSignedUrl(photo.file_path, 60 * 60 * 24)
    if (signed?.signedUrl) photoUrls.push({ caption: photo.caption, url: signed.signedUrl })
  }

  const clause = job ? getAS3000ClauseForJob(job.title, job.description || '') : null

  return NextResponse.json({
    certificate: {
      certificate_number: sheet.certificate_number,
      test_date: sheet.test_date,
      completed_at: sheet.completed_at,
      installation_address: sheet.installation_address,
      switchboard_location: sheet.switchboard_location,
      supply_type: sheet.supply_type,
      circuits: sheet.circuits,
      tester_name: sheet.tester_name,
      tester_license: sheet.tester_license,
      notes: sheet.notes,
    },
    job: job ? { title: job.title, customer_name: job.customer_name, customer_address: job.customer_address } : null,
    business: tenant ?? null,
    clause: clause ? { reference: clause.reference, title: clause.title } : null,
    photos: photoUrls,
  })
}
