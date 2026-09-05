import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  // The Fault Finder API reads its persona and manual from disk at request
  // time. Tracing can't see those dynamic paths, so include them explicitly
  // or the route 500s in production.
  outputFileTracingIncludes: {
    "/api/assistant": ["./knowledge/fault-finder/**"],
  },
};

export default nextConfig;
