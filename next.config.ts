/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ltbacrfoksjzfszpsmow.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ltbacrfoksjzfszpsmow.storage.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['ioredis', '@supabase/supabase-js'],
  productionBrowserSourceMaps: false,
  outputFileTracingIncludes: {
    '/': ['./node_modules/**/*.js', './node_modules/**/*.json'],
  },
  // 解决工作区根目录检测问题
  turbopack: {
    // 设置正确的根目录
    root: process.cwd(),
  },
  experimental: {
    // 移除无效的middleware配置和重复的serverComponentsExternalPackages配置
  },
};

module.exports = nextConfig;
