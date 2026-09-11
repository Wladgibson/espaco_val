import { createClient } from '@/lib/supabase/server'

export async function getAvailableSlots(serviceId: string, dateISO: string): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_service_id: serviceId,
    p_date: dateISO,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map((row: { slot_start: string }) => row.slot_start)
}