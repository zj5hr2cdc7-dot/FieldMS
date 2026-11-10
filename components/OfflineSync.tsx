'use client'

import { useEffect, useState } from 'react'
import { flushQueue, pendingCount } from '@/lib/offline-queue'

/**
 * Registers the service worker, watches connectivity, and replays the offline
 * queue when the connection returns. Shows a slim banner while offline or
 * while queued changes are waiting to sync.
 */
export default function OfflineSync() {
  const [offline, setOffline] = useState(false)
  const [pending, setPending] = useState(0)
  const [justSynced, setJustSynced] = useState(0)
  const [rejected, setRejected] = useState<string[]>([])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      } else {
        // In development the SW's cache-first asset strategy serves stale
        // builds — unregister any previously installed worker and its caches.
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {})
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
        }
      }
    }

    const initTimer = window.setTimeout(() => {
      setOffline(!navigator.onLine)
      setPending(pendingCount())
    }, 0)

    const flush = async () => {
      const { synced, failed } = await flushQueue()
      setPending(pendingCount())
      if (failed.length) setRejected(failed)
      if (synced > 0) window.dispatchEvent(new Event('fieldms-synced'))
      if (synced > 0) {
        setJustSynced(synced)
        window.setTimeout(() => setJustSynced(0), 4000)
      }
    }

    const handleOnline = () => {
      setOffline(false)
      flush()
    }
    const handleOffline = () => setOffline(true)
    const handleQueued = () => setPending(pendingCount())

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('fieldms-queued', handleQueued)

    // Flush anything left over from a previous session
    if (navigator.onLine) flush()

    return () => {
      window.clearTimeout(initTimer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('fieldms-queued', handleQueued)
    }
  }, [])

  if (rejected.length && !offline) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-center gap-3 bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white">
        <span>Back online, but {rejected.join(', ')} could not be saved. Please check and redo {rejected.length > 1 ? 'them' : 'it'}.</span>
        <button type="button" onClick={() => setRejected([])} className="rounded border border-white/60 px-2 py-0.5 text-xs">OK</button>
      </div>
    )
  }

  if (!offline && pending === 0 && justSynced === 0) return null

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-50 px-4 py-2.5 text-center text-sm font-medium text-white ${
        offline ? 'bg-amber-600' : justSynced ? 'bg-brand' : 'bg-slate-700'
      }`}
    >
      {offline
        ? `You're offline — changes are saved on this device and will sync automatically.${pending > 0 ? ` (${pending} pending)` : ''}`
        : justSynced > 0
          ? `Back online — ${justSynced} queued change${justSynced > 1 ? 's' : ''} synced.`
          : `Syncing ${pending} queued change${pending > 1 ? 's' : ''}…`}
    </div>
  )
}
