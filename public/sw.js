/*
 * FieldMS service worker — offline-capable app shell.
 * Pain point addressed: Jobber/Tradify/Housecall Pro are unusable in basements,
 * switchrooms, and rural dead zones. FieldMS keeps working read-only offline,
 * and queued changes sync when signal returns (see lib/offline-queue.ts).
 */

const CACHE_NAME = 'fieldms-v2'
const APP_SHELL = ['/', '/dashboard', '/dashboard/jobs', '/dashboard/schedule', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never intercept API or Supabase traffic — the offline queue handles writes
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
            return response
          })
      )
    )
    return
  }

  // Pages: network-first, fall back to cache when offline
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
  )
})
