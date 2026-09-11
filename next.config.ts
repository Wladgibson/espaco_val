import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs/config'

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
}

const config = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: 'wlad-ua',
      project: 'salao-pwa',
      silent: !process.env.CI,
    })
  : nextConfig

export default config