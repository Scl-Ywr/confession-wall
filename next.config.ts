import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
    ],
  },
  serverExternalPackages: ['ioredis'],
  turbopack: {},
};

export default nextConfig;
