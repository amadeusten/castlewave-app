import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        'react-map-gl': 'react-map-gl',
      }
    }
  },
  // If you already have other configuration settings (like image domains), keep them here!
};

export default nextConfig;