import type { MetadataRoute } from 'next'
import { SITE_URL, PRIVATE_PREFIXES, TOKEN_PREFIXES } from '@/lib/seo'

/**
 * https://fieldms.com.au/robots.txt — generated, not a static file, so the
 * disallow list cannot drift away from the route list in lib/seo.ts.
 *
 * Two different kinds of "keep out" here, and the difference matters:
 *
 *   PRIVATE_PREFIXES (/dashboard, /field, /api …) are disallowed. There is
 *   nothing behind them for a signed-out crawler anyway, and crawling them
 *   only burns crawl budget that should go on the marketing pages.
 *
 *   TOKEN_PREFIXES (/invoice/…, /certificate/… — a customer's actual
 *   documents) are deliberately NOT listed here. That looks backwards, so:
 *   robots.txt stops a page being *crawled*, not *indexed*. Google will still
 *   index a disallowed URL it finds linked elsewhere, it just shows it with no
 *   description — and it can never see a noindex tag on a page it is forbidden
 *   to fetch. Those routes are therefore left crawlable and serve an
 *   X-Robots-Tag: noindex header instead (see next.config.ts), which is the
 *   only combination that actually keeps them out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [...PRIVATE_PREFIXES],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
