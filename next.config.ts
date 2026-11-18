import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // eBay CDN product images, e.g. https://i.ebayimg.com/images/g/...
      { protocol: 'https', hostname: '**.ebayimg.com' },
    ],
  },
};

export default nextConfig;
