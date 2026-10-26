import type { NextConfig } from "next";
import { PRIVATE_PREFIXES, TOKEN_PREFIXES } from "./lib/seo";

const NOINDEX = "noindex, nofollow, noarchive";

/*
 * Baseline security headers on every response.
 *
 * - HSTS: the site is HTTPS-only on Vercel; tell browsers never to try HTTP.
 * - nosniff: stops a browser treating an uploaded file as HTML or script.
 * - frame-ancestors / X-Frame-Options: no page of FieldMS should ever be
 *   framed by another site (clickjacking on quote approval or sign-in).
 * - Referrer-Policy: token links (/invoice/<token> etc.) must never leak in
 *   full to other sites when a customer clicks out of them.
 * - Permissions-Policy: camera and location are used by the field app on our
 *   own origin only; nothing needs the microphone.
 *
 * A full Content-Security-Policy is deliberately not set yet: Next.js inline
 * scripts need nonces to work under a strict CSP, and a wrong CSP breaks the
 * app in production. Add it as a separate, tested change.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=()" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  // The Fault Finder API reads its persona from disk at request
  // time. Tracing can't see those dynamic paths, so include them explicitly
  // or the route 500s in production.
  outputFileTracingIncludes: {
    "/api/assistant": ["./knowledge/fault-finder/**"],
  },

  /*
   * Keep private pages out of search results.
   *
   * The token routes are the ones that matter. /invoice/<token> and friends
   * are publicly reachable by design — that is how a customer opens the
   * invoice we emailed them, with no login. But they carry another business's
   * customer names, site addresses, prices and compliance records, and a
   * single customer pasting that link into a public forum, a Facebook group or
   * a help-desk ticket is enough for Google to find and index it. At that
   * point one electrician's invoice is a search result.
   *
   * X-Robots-Tag is used rather than a robots.txt Disallow because a
   * disallowed page can still be indexed from an external link — the crawler
   * is told not to fetch it, so it never sees any noindex instruction. Serving
   * the header keeps the page fetchable and unambiguously excluded.
   *
   * This is defence in depth, not the security control. The tokens being long
   * and unguessable is the security control.
   */
  async headers() {
    const headers = [{ key: "X-Robots-Tag", value: NOINDEX }];

    const noindex = [...TOKEN_PREFIXES, ...PRIVATE_PREFIXES]
      .filter((prefix) => !prefix.startsWith("/api"))
      .map((prefix) => prefix.replace(/\/$/, ""))
      // Two patterns per prefix: "/dashboard/:path*" does not match
      // "/dashboard" itself, and the bare route is the one most likely to be
      // linked from outside.
      .flatMap((prefix) => [
        { source: prefix, headers },
        { source: `${prefix}/:path*`, headers },
      ]);

    return [{ source: "/:path*", headers: SECURITY_HEADERS }, ...noindex];
  },
};

export default nextConfig;
