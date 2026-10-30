import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Resolve visibility metadata before headers, including for browsers/Googlebot:
  // a missing or hidden public game must return 404 rather than a streamed 200.
  htmlLimitedBots: /.*/,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
