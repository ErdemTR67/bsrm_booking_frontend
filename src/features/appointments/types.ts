import type { CustomerInput } from '../customers/types'

export type AvailabilitySlot = {
  employee_id: string; service_id: string; starts_at: string; ends_at: string
  duration_minutes: number; buffer_before_minutes: number; buffer_after_minutes: number
}
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type AppointmentService = {
  id: string; service_id: string; service_name: string; duration_minutes: number
  price_cents: number | null; position: number
}
export type Appointment = {
  id: string; location_id: string; employee_id: string; customer_id: string | null
  starts_at: string; ends_at: string; status: AppointmentStatus; customer_name: string
  customer_email: string | null; customer_phone: string | null; notes: string | null
  cancellation_reason: string | null; services: AppointmentService[]; created_at: string; updated_at: string
}
export type AppointmentInput = {
  location_id: string; employee_id: string; service_ids: string[]; starts_at: string
  customer_id?: string | null; customer?: CustomerInput | null; notes?: string | null
}
