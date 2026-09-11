'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData) {
  const fullName = (formData.get('full_name') as string)?.trim()
  const phone = (formData.get('phone') as string)?.trim()
  const birthDate = (formData.get('birth_date') as string) || null
  const notes = (formData.get('notes') as string) || null

  if (!fullName || !phone) return { error: 'Nome e telefone são obrigatórios' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { error } = await supabase
    .from('clients')
    .update({ full_name: fullName, phone, birth_date: birthDate, notes })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/minha-conta')
  return { success: true }
}