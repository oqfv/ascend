import type { NextConfig } from "next";

const CANONICAL = "https://ascend-tracker.me";

const nextConfig: NextConfig = {
  // One public address. /api/ stays on the old host because Vercel's scheduled job may call it there.
  async redirects() {
    return [
      { source: "/:path*", has: [{ type: "host", value: "www.ascend-tracker.me" }], destination: `${CANONICAL}/:path*`, permanent: true },
      { source: "/:path((?!api/).*)", has: [{ type: "host", value: "ascend-ten-indol.vercel.app" }], destination: `${CANONICAL}/:path`, permanent: true },
    ];
  },
};

export default nextConfig;
