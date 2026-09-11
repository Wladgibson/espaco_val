import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BookingFlow } from './BookingFlow'

export default async function AgendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/agendar')

  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, price_cents')
    .eq('is_active', true)
    .order('name')

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-pink-600 mb-4">Agendar</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <BookingFlow services={services ?? []} />
      </Suspense>
    </main>
  )
}