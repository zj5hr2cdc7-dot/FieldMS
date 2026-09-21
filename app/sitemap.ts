import type { MetadataRoute } from 'next'
import { PUBLIC_ROUTES, absoluteUrl } from '@/lib/seo'

/**
 * https://fieldms.com.au/sitemap.xml
 *
 * Deliberately short. A sitemap is a list of pages you are asking Google to
 * rank, not an inventory of every URL that resolves — padding it with auth
 * screens and token pages dilutes the signal and, for the token pages, would
 * be handing over customer documents.
 *
 * `lastModified` uses the build date. That is honest here because the
 * marketing copy only changes when the site is redeployed. If these pages ever
 * become content-managed, take the date from the content instead: a sitemap
 * that claims everything changed today, every day, gets ignored.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }))
}
