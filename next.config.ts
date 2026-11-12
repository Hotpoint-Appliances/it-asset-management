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
};

export default nextConfig;
