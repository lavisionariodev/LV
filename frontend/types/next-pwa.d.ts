declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  type WithPwaOptions = Record<string, unknown>

  export default function withPWAInit(options: WithPwaOptions): (nextConfig: NextConfig) => NextConfig
}

