/*
 * FieldMS service worker — offline-capable app shell.
 * Pain point addressed: Jobber/Tradify/Housecall Pro are unusable in basements,
 * switchrooms, and rural dead zones. FieldMS keeps working read-only offline,
 * and queued changes sync when signal returns (see lib/offline-queue.ts).
 *
 * ── WHY THE CACHING STRATEGY CHANGED ────────────────────────────────────────
 * v2 served everything under /_next/static/ cache-first. That is only safe when
 * asset filenames are content-hashed, so new content means a new URL. This
 * build's chunk names are NOT stable in that way: after a deploy the same
 * filename came back with different contents. Cache-first therefore pinned
 * every returning visitor to the JavaScript from their first visit, forever.
 *
 * It was not theoretical. A corrected Supabase key was deployed and verified on
 * the server, yet the browser kept sending the old broken one, because
 * 0wramr0ynee~n.js was being served from this cache. Sign in failed with
 * "Invalid API key" against a deployment that was actually correct. Every
 * future deploy would have been invisible to existing users the same way.
 *
 * Now: code (JS/CSS) and pages are NETWORK-FIRST, falling back to cache only
 * when the network fails — so a deploy takes effect on the next load, and the
 * app still works offline. Only genuinely immutable media stays cache-first.
 *
 * CACHE_NAME must be bumped whenever this file's strategy changes; `activate`
 * deletes every cache that does not match, which is what finally evicts a bad
 * one from users' browsers.
 */

const CACHE_NAME = 'fieldms-v3'
const APP_SHELL = ['/', '/dashboard', '/dashboard/jobs', '/dashboard/schedule', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

// Allow the page to force an update without the user clearing site data.
self.addEventListener('message', (event) => {
  if (event.data === 'fieldms-skip-waiting') self.skipWaiting()
})

/** Network first, falling back to whatever we cached last time. */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const copy = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || caches.match('/')
  }
}

/** Cache first — only for bytes that never change under the same name. */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok) {
    const copy = response.clone()
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {})
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never intercept API or Supabase traffic — the offline queue handles writes
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return

  // Never cache the service worker itself, or the browser can pin a broken one.
  if (url.pathname === '/sw.js') return

  // Images and fonts are safe to serve from cache: the bytes behind a given
  // name do not change, and they are not what a deploy needs to update.
  if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Everything else — pages, JS, CSS — must reflect the latest deploy.
  event.respondWith(networkFirst(request))
})
