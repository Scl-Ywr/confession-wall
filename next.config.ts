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
      // 音乐封面图片域名
      {
        protocol: 'https',
        hostname: 'p3.music.126.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'p4.music.126.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: ['ioredis', '@supabase/supabase-js'],
  productionBrowserSourceMaps: false,
  // 明确指定工作区根目录，解决多个锁文件导致的构建问题
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // 移除无效的middleware配置和重复的serverComponentsExternalPackages配置
  },
};

module.exports = nextConfig;
