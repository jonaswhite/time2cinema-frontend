import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // 在生產環境構建時忽略 ESLint 錯誤
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 在生產環境構建時忽略 TypeScript 錯誤
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://time2cinema-backend.onrender.com/api/:path*',
      },
    ];
  },
};

export default nextConfig;
