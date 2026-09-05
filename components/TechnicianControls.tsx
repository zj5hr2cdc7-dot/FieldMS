'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { JobEventType } from '@/types/database'

interface TechnicianControlsProps {
  jobId: string
}

const NEXT_EVENT: Partial<Record<JobEventType | 'none', JobEventType>> = {
  none: 'travel_started',
  travel_started: 'job_started',
  job_started: 'job_completed',
}

const BUTTON_LABELS: Record<JobEventType, string> = {
  travel_started: 'Start Travel',
  job_started: 'Start Job',
  job_completed: 'Complete Job',
}

const BUTTON_COLORS: Record<JobEventType, string> = {
  travel_started: 'bg-sky-600 hover:bg-sky-700 text-white',
  job_started: 'bg-brand hover:bg-brand-dark text-white',
  job_completed: 'bg-ink hover:bg-ink-light text-white',
}

const STATUS_LABELS: Record<JobEventType, string> = {
  travel_started: 'En route',
  job_started: 'On site',
  job_completed: 'Completed',
}

export default function TechnicianControls({ jobId }: TechnicianControlsProps) {
  const [lastEvent, setLastEvent] = useState<JobEventType | 'none' | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null)
  const gpsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const postLocation = useCallback(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsError(null)
        try {
          await fetch(`/api/jobs/${jobId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            }),
          })
        } catch {
          // non-fatal
        }
      },
      (err) => {
        setGpsError(`GPS unavailable: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [jobId])

  const startGpsPolling = useCallback(() => {
    postLocation()
    if (!gpsIntervalRef.current) {
      gpsIntervalRef.current = setInterval(postLocation, 12000)
    }
  }, [postLocation])

  const stopGpsPolling = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current)
      gpsIntervalRef.current = null
    }
  }, [])

  // Fetch the latest event on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/events`)
        if (res.ok) {
          const json = await res.json()
          const eventType: JobEventType | null = json.event?.event_type ?? null
          setLastEvent(eventType ?? 'none')
          if (eventType === 'travel_started') startGpsPolling()
        }
      } catch {
        setLastEvent('none')
      } finally {
        setLoading(false)
      }
    }
    load()
    return () => stopGpsPolling()
  }, [jobId, startGpsPolling, stopGpsPolling])

  const handleAction = async () => {
    if (!lastEvent === null || submitting) return
    const nextEvent = NEXT_EVENT[lastEvent as JobEventType | 'none']
    if (!nextEvent) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: nextEvent }),
      })
      if (!res.ok) throw new Error('Request failed')

      setLastEvent(nextEvent)

      if (nextEvent === 'travel_started') {
        startGpsPolling()
        // Generate tracking link
        try {
          const tokenRes = await fetch(`/api/jobs/${jobId}/token`, { method: 'POST' })
          if (tokenRes.ok) {
            const tokenJson = await tokenRes.json()
            setTrackingUrl(tokenJson.trackingUrl)
          }
        } catch {
          // non-fatal
        }
      }

      if (nextEvent === 'job_completed') {
        stopGpsPolling()
      }
    } catch (err) {
      console.error('Event post failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mt-4 h-12 animate-pulse rounded-xl bg-slate-200" />
    )
  }

  const nextEvent = NEXT_EVENT[lastEvent as JobEventType | 'none']
  const isDone = lastEvent === 'job_completed'

  return (
    <div className="card mt-4 space-y-3 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Technician controls</p>
          {lastEvent && lastEvent !== 'none' && (
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {STATUS_LABELS[lastEvent as JobEventType]}
            </p>
          )}
        </div>

        {!isDone && nextEvent && (
          <button
            onClick={handleAction}
            disabled={submitting}
            className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_COLORS[nextEvent]}`}
          >
            {submitting ? 'Updating…' : BUTTON_LABELS[nextEvent]}
          </button>
        )}

        {isDone && (
          <span className="rounded-full bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
            Job complete
          </span>
        )}
      </div>

      {trackingUrl && (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{trackingUrl}</p>
          <button
            onClick={() => navigator.clipboard?.writeText(trackingUrl)}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Copy
          </button>
        </div>
      )}

      {gpsError && (
        <p className="text-xs text-amber-600">{gpsError}</p>
      )}

      {lastEvent === 'travel_started' && !gpsError && (
        <p className="text-xs text-slate-400">
          GPS updating every 12 seconds
        </p>
      )}
    </div>
  )
}
