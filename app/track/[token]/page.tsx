'use client'
/* eslint-disable @typescript-eslint/no-explicit-any -- Google Maps JS API has no bundled types in this project */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Script from 'next/script'
import type { JobEventType } from '@/types/database'

interface TrackingData {
  job: { id: string; title: string; status: string; customer_address: string | null }
  latestLocation: { lat: number; lng: number; recorded_at: string } | null
  latestEvent: { event_type: JobEventType; created_at: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  travel_started: 'Technician is on the way',
  job_started: 'Technician is on site',
  job_completed: 'Job completed',
}

const EVENT_COLOR: Record<string, string> = {
  travel_started: 'text-sky-600',
  job_started: 'text-brand-dark',
  job_completed: 'text-brand-dark',
}

export default function TrackingPage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData] = useState<TrackingData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracking/${token}`)
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'Tracking link not found.')
        return
      }
      const json: TrackingData = await res.json()
      setData(json)
      setLastUpdated(new Date())
    } catch {
      setError('Unable to load tracking data.')
    }
  }, [token])

  // Initial fetch and 12-second polling
  useEffect(() => {
    const id = setInterval(() => { void fetchTracking() }, 12000)
    const initial = setTimeout(() => { void fetchTracking() }, 0)
    return () => { clearInterval(id); clearTimeout(initial) }
  }, [fetchTracking])

  // Initialize map once Maps API is loaded
  useEffect(() => {
    if (!mapsLoaded || !mapDivRef.current) return
    const google = (window as any).google
    mapRef.current = new google.maps.Map(mapDivRef.current, {
      zoom: 14,
      center: { lat: -33.8688, lng: 151.2093 },
      mapTypeControl: false,
      streetViewControl: false,
    })
  }, [mapsLoaded])

  // Move the marker whenever location data changes
  useEffect(() => {
    if (!mapsLoaded || !mapRef.current || !data?.latestLocation) return
    const google = (window as any).google
    const pos = { lat: data.latestLocation.lat, lng: data.latestLocation.lng }

    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: 'Technician',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#4a9c4a',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      })
    } else {
      markerRef.current.setPosition(pos)
    }

    mapRef.current.panTo(pos)
  }, [data?.latestLocation, mapsLoaded])

  const eventLabel = data?.latestEvent
    ? STATUS_LABELS[data.latestEvent.event_type] ?? data.latestEvent.event_type
    : null

  const eventColor = data?.latestEvent
    ? EVENT_COLOR[data.latestEvent.event_type] ?? 'text-slate-600'
    : 'text-slate-500'

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}`}
        strategy="afterInteractive"
        onLoad={() => setMapsLoaded(true)}
      />

      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-6 py-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-dark">Live job tracking</p>
              {data ? (
                <h1 className="mt-1 text-xl font-bold text-slate-900">{data.job.title}</h1>
              ) : (
                <div className="mt-1 h-6 w-48 animate-pulse rounded-full bg-slate-200" />
              )}
            </div>
            {data?.job.customer_address && (
              <p className="hidden text-right text-sm text-slate-500 sm:block">{data.job.customer_address}</p>
            )}
          </div>
        </header>

        {error ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-sm rounded-xl border border-red-200 bg-red-50 p-8 text-center">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : (
          <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-3xl space-y-4">
              {/* Status card */}
              <div className="card p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Status</p>
                    {data ? (
                      <p className={`mt-2 text-lg font-semibold ${eventColor}`}>
                        {eventLabel ?? 'Waiting for technician to depart…'}
                      </p>
                    ) : (
                      <div className="mt-2 h-5 w-56 animate-pulse rounded-full bg-slate-200" />
                    )}
                  </div>
                  {lastUpdated && (
                    <p className="text-right text-xs text-slate-400">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {!data?.latestLocation && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                    <p className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500 shadow-sm">
                      {data?.latestEvent
                        ? 'Acquiring technician location…'
                        : 'Waiting for technician to start travel…'}
                    </p>
                  </div>
                )}
                <div ref={mapDivRef} className="h-[420px] w-full" />
              </div>

              {/* Last location timestamp */}
              {data?.latestLocation && (
                <p className="text-center text-xs text-slate-400">
                  Location updated {new Date(data.latestLocation.recorded_at).toLocaleTimeString()}
                  {' · '}refreshes every 12 seconds
                </p>
              )}

              {/* Completed banner */}
              {data?.latestEvent?.event_type === 'job_completed' && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <p className="text-lg font-semibold text-green-700">Job completed</p>
                  <p className="mt-1 text-sm text-slate-500">Thank you for choosing FieldMS.</p>
                </div>
              )}
            </div>
          </main>
        )}
      </div>
    </>
  )
}
