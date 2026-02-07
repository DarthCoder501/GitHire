import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Turbopack is the default bundler in Next.js 16.
   * We avoid custom webpack configuration to keep full Turbopack compatibility.
   * Static assets like `.glb` served from `public/` work without extra config.
   */
  turbopack: {},
};

export default nextConfig;
