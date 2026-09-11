export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Professional {
  id: string
  full_name: string
  bio: string | null
  working_hours: WorkingHours
  slot_duration_minutes: number
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface WorkingInterval {
  start: string
  end: string
}

export type WorkingHours = Record<Weekday, WorkingInterval[]>

export interface Client {
  id: string
  full_name: string
  phone: string
  birth_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Appointment {
  id: string
  client_id: string
  service_id: string
  professional_id: string
  starts_at: string
  ends_at: string
  status: AppointmentStatus
  client_notes: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentWithService extends Appointment {
  service: Pick<Service, 'name' | 'duration_minutes' | 'price_cents'>
}