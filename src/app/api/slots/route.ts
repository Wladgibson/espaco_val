import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get('service_id')
  const date = request.nextUrl.searchParams.get('date')
  if (!serviceId || !date) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 })
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_available_slots', {
    p_service_id: serviceId,
    p_date: date,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slots: (data ?? []).map((r: { slot_start: string }) => r.slot_start) })
}