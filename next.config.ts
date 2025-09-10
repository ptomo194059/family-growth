import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 這裡可以放其他 Next.js 設定
  reactStrictMode: true,

  eslint: {
    // ✅ 忽略 ESLint 錯誤，不會阻擋 production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
