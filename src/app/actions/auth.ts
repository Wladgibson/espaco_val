'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { checkOtpLimit } from '@/lib/ratelimit'

type SendOtpResult =
  | { error: string }
  | { success: true; email: string }

export async function sendOtp(formData: FormData): Promise<SendOtpResult> {
  const rawEmail = formData.get('email')
  const email = typeof rawEmail === 'string' ? rawEmail.trim() : ''
  const rawName = formData.get('full_name')
  const fullName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined
  const rawPhone = formData.get('phone')
  const phone = typeof rawPhone === 'string' && rawPhone.trim() ? rawPhone.trim() : undefined

  if (!email) return { error: 'Email obrigatório' }

  // Rate limit: 3 OTPs / hora por IP
  const hdrs = await headers()
  const ip = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? hdrs.get('x-real-ip')
    ?? 'unknown'
  const limit = await checkOtpLimit(ip)
  if (limit && !limit.success) {
    Sentry.captureMessage('sendOtp rate-limited', { extra: { ip } })
    const minutes = Math.ceil((limit.reset - Date.now()) / 60000)
    return { error: `Muitas tentativas. Tente em ${minutes} min.` }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: fullName && phone ? { full_name: fullName, phone } : undefined,
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/auth/callback`,
      },
    })

    if (error) {
      Sentry.captureException(error, { extra: { email, ip } })
      return { error: error.message }
    }
  } catch (err) {
    Sentry.captureException(err)
    return { error: 'Erro inesperado ao enviar email' }
  }

  return { success: true, email }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}