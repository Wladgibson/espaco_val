'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { checkBookLimit } from '@/lib/ratelimit'

export async function bookAppointment(formData: FormData) {
  const serviceId = formData.get('service_id') as string
  const startsAt = formData.get('starts_at') as string
  const clientNotes = (formData.get('client_notes') as string) || null

  if (!serviceId || !startsAt) {
    return { error: 'Selecione serviço e horário' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado' }

  // Rate limit: 5 bookings / 10 min por user
  const limit = await checkBookLimit(user.id)
  if (limit && !limit.success) {
    Sentry.captureMessage('bookAppointment rate-limited', { extra: { userId: user.id, reset: limit.reset } })
    const minutes = Math.ceil((limit.reset - Date.now()) / 60000)
    return { error: `Muitas tentativas. Tente em ${minutes} min.` }
  }

  try {
    const { data: pro } = await supabase.from('professionals').select('id').limit(1).single()
    if (!pro) return { error: 'Profissional não configurado' }

    const { error } = await supabase.from('appointments').insert({
      client_id: user.id,
      service_id: serviceId,
      professional_id: pro.id,
      starts_at: startsAt,
      client_notes: clientNotes,
      status: 'pending',
    })

    if (error) {
      const friendly = error.message.includes('overlap') || error.message.includes('Slot')
        ? 'Esse horário acabou de ser ocupado. Escolha outro.'
        : error.message
      Sentry.captureException(error, { extra: { userId: user.id, serviceId, startsAt } })
      return { error: friendly }
    }

    revalidatePath('/meus-agendamentos')
  } catch (err) {
    Sentry.captureException(err)
    return { error: 'Erro inesperado ao agendar' }
  }

  redirect('/meus-agendamentos')
}

export async function cancelAppointment(appointmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId)
    .eq('client_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/meus-agendamentos')
  return { success: true }
}

export async function updateAppointmentStatus(appointmentId: string, status: 'confirmed' | 'completed' | 'cancelled') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  // RLS garante is_admin via policy
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)

  if (error) return { error: error.message }
  revalidatePath('/admin/agenda')
  return { success: true }
}