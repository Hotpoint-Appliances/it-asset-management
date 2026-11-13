import type { NextConfig } from "next";

// Serving the app under a sub-path (e.g. https://host/itam). Inlined into the client bundle at
// build time, so changing it needs a rebuild, not just a restart. Empty = served at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
if (basePath && (!basePath.startsWith("/") || basePath.endsWith("/"))) {
  throw new Error(
    `NEXT_PUBLIC_BASE_PATH must start with "/" and not end with one (got "${basePath}")`,
  );
}

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  basePath: basePath || undefined,
  experimental: {
    // Keep a visited page's server-rendered data in the browser for 30s, so going back to the
    // dashboard or the assets list a moment later is instant instead of a fresh round-trip
    // (Next 15+ defaults this to 0). Your own saves still show at once: they end in a
    // `router.refresh()`, or a push that refreshes (`useRouteLoadingRouter`), which drops the
    // whole cache. Other users' changes show after 30s, or on the page's Refresh button.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
