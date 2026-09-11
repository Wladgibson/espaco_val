import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

let redis: Redis | null = null
let bookLimiter: Ratelimit | null = null
let otpLimiter: Ratelimit | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

// 5 agendamentos por 10 minutos por user (autenticado)
export function getBookLimiter(): Ratelimit | null {
  if (bookLimiter) return bookLimiter
  const r = getRedis()
  if (!r) return null
  bookLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'ratelimit:book',
    analytics: true,
  })
  return bookLimiter
}

// 3 OTPs por hora por IP (anti-spam de magic link)
export function getOtpLimiter(): Ratelimit | null {
  if (otpLimiter) return otpLimiter
  const r = getRedis()
  if (!r) return null
  otpLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'ratelimit:otp',
    analytics: true,
  })
  return otpLimiter
}

export async function checkBookLimit(userId: string): Promise<{ success: boolean; remaining: number; reset: number } | null> {
  const limiter = getBookLimiter()
  if (!limiter) return null // sem Upstash configurado, sem rate limit
  const { success, remaining, reset } = await limiter.limit(userId)
  return { success, remaining, reset }
}

export async function checkOtpLimit(ip: string): Promise<{ success: boolean; remaining: number; reset: number } | null> {
  const limiter = getOtpLimiter()
  if (!limiter) return null
  const { success, remaining, reset } = await limiter.limit(ip)
  return { success, remaining, reset }
}