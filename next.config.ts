import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: Static export (output: 'export') is not used because:
  // 1. Dynamic routes like /vault/[id] need server-side support
  // 2. Lit Protocol SDK has bundling issues with static export
  // 
  // Deploy to Vercel, Netlify, or any Next.js-compatible host.
  // The app has no API routes - all logic runs client-side.
  images: {
    unoptimized: true,
  },
  // Empty turbopack config to use Turbopack (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
