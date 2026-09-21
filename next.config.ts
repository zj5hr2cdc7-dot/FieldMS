import type { NextConfig } from "next";
import { PRIVATE_PREFIXES, TOKEN_PREFIXES } from "./lib/seo";

const NOINDEX = "noindex, nofollow, noarchive";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  // The Fault Finder API reads its persona and manual from disk at request
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

    return [...TOKEN_PREFIXES, ...PRIVATE_PREFIXES]
      .filter((prefix) => !prefix.startsWith("/api"))
      .map((prefix) => prefix.replace(/\/$/, ""))
      // Two patterns per prefix: "/dashboard/:path*" does not match
      // "/dashboard" itself, and the bare route is the one most likely to be
      // linked from outside.
      .flatMap((prefix) => [
        { source: prefix, headers },
        { source: `${prefix}/:path*`, headers },
      ]);
  },
};

export default nextConfig;
