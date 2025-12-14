import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export for now - dynamic routes need server
  // For static deployment, use URL-based vault encoding instead
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
