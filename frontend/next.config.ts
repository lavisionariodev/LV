import type { NextConfig } from 'next'
import withPWAInit from 'next-pwa'

const supabaseHostname = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
})()

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/admin/listings',
        destination: '/admin/listings/browse',
        permanent: true,
      },
      {
        source: '/admin/listings/review',
        destination: '/admin/listings/approvals',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
              pathname: '/storage/v1/object/public/**',
            },
          ]
        : []),
    ],
  },
}

export default withPWA(nextConfig)