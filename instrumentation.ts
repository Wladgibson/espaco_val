// Sentry is auto-initialized via sentry.client.config.ts and sentry.server.config.ts
// (auto-discovered by @sentry/nextjs when SENTRY_DSN is set).
//
// Next.js 16 signature for onRequestError matches the Instrumentation type.

import type { Instrumentation } from 'next'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('@sentry/nextjs')
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (!process.env.SENTRY_DSN) return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureException(err, {
    extra: { path: request.path, method: request.method, ...context },
  })
}