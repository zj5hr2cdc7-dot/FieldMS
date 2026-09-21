/**
 * Single source of truth for which routes search engines may see.
 *
 * robots.ts, sitemap.ts and next.config.ts all read from here. Keeping one
 * list is the point: the failure mode with SEO route config is that someone
 * adds a route, updates one of the three files, and a customer's invoice ends
 * up in Google eighteen months later with nobody having touched it since.
 */

/**
 * Canonical origin. The apex, not www — www redirects here, Supabase's Site
 * URL and the auth redirect allow-list are both set to the apex, and og:url
 * points at it. Changing this means changing all of those together.
 */
export const SITE_URL = 'https://fieldms.com.au'

/**
 * Signed-in application surface. Nothing here is useful to a crawler: it is
 * all behind auth and renders empty. Disallowed in robots.txt so crawl budget
 * goes to the marketing pages instead.
 */
export const PRIVATE_PREFIXES = [
  '/dashboard',
  '/field',
  '/api/',
  '/estimates',
  '/verify-email',
  '/reset-password',
] as const

/**
 * Public-but-not-public: pages reachable by anyone holding an unguessable
 * token, because that is how a customer opens the quote or invoice we emailed
 * them. They contain another business's customer names, addresses, prices and
 * compliance records.
 *
 * These must never be indexed. They are left crawlable on purpose so that the
 * noindex header in next.config.ts is actually seen — see the note in
 * robots.ts for why blocking them in robots.txt would be the weaker option.
 */
export const TOKEN_PREFIXES = [
  '/quote',
  '/invoice',
  '/certificate',
  '/report',
  '/document',
  '/track',
  '/variation',
  '/unsubscribe',
] as const

/** Pages that should rank. Anything not listed here is not in the sitemap. */
export const PUBLIC_ROUTES: {
  path: string
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority: number
}[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/signup', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.3 },
]

/** Absolute URL for a path, for canonicals and the sitemap. */
export function absoluteUrl(path: string): string {
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`
}
