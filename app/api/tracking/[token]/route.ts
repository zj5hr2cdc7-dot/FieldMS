import { NextResponse } from 'next/server'
import { getTrackingDataByToken } from '@/lib/tracking'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const data = await getTrackingDataByToken(token)

  if (!data) {
    return NextResponse.json({ error: 'Tracking link not found' }, { status: 404 })
  }

  return NextResponse.json({
    job: {
      id: data.job.id,
      title: data.job.title,
      status: data.job.status,
      customer_address: data.job.customer_address,
    },
    latestLocation: data.latestLocation
      ? { lat: data.latestLocation.lat, lng: data.latestLocation.lng, recorded_at: data.latestLocation.recorded_at }
      : null,
    latestEvent: data.latestEvent
      ? { event_type: data.latestEvent.event_type, created_at: data.latestEvent.created_at }
      : null,
  })
}
