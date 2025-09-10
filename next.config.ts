
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  i18n: {
    locales: ['es', 'ca'],
    defaultLocale: 'es',
  },
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  devIndicators: {
    allowedDevOrigins: [
        '*.cloudworkstations.dev',
    ]
  },
};

export default nextConfig;
