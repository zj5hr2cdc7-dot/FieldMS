import { createBrowserClient } from '@supabase/ssr'

/**
 * The browser Supabase client, created lazily.
 *
 * WHY LAZY
 *   This used to run createBrowserClient() at module scope. That meant simply
 *   *importing* this file constructed a client, and @supabase/ssr throws if the
 *   URL or key is missing. Next.js evaluates modules on the server while
 *   prerendering, so the production build died on a page that never touches
 *   Supabase at all:
 *
 *     Error occurred prerendering page "/_not-found"
 *     Error: @supabase/ssr: Your project's URL and API key are required
 *
 *   Building the client on first call instead means importing is free, the
 *   constructor only runs in the browser where the NEXT_PUBLIC_ values are
 *   inlined, and a missing variable surfaces as a clear error at the point of
 *   use rather than as a build failure on an unrelated page.
 *
 *   Still a single shared instance: Supabase keeps auth state on the client
 *   object, so creating more than one per tab causes sessions to drift apart.
 */
// Typed off the call itself rather than off createBrowserClient. Writing
// ReturnType<typeof createBrowserClient> resolves that generic to its default
// type arguments, which silently widens rows to `any` and breaks inference in
// every caller (ten TS7006 errors when I first wrote it this way).
function build() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. In local development they ' +
        'come from .env.local; in production they must be set in the hosting ' +
        'environment BEFORE the build, because NEXT_PUBLIC_ values are baked ' +
        'into the bundle at build time rather than read at runtime.'
    )
  }

  return createBrowserClient(url, anonKey)
}

let client: ReturnType<typeof build> | undefined

export function createClient() {
  if (!client) client = build()
  return client
}
