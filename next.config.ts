import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Trailing slashes help with static hosting on GitHub Pages, etc.
  trailingSlash: true,
};

export default nextConfig;
