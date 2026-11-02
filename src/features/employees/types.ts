export type Employee = {
  id: string; location_id: string; user_id: string | null; first_name: string; last_name: string
  email: string | null; phone: string | null; display_color: string | null; is_bookable: boolean
  is_active: boolean; created_at: string; updated_at: string
}
export type EmployeeInput = {
  location_id: string
  user_id?: string | null
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  display_color?: string | null
  is_bookable?: boolean
}
export type EmployeeService = {
  employee_id: string; service_id: string; custom_duration_minutes: number | null
  custom_price_cents: number | null; is_active: boolean; created_at: string
}
export type EmployeeAvailability = {
  id: string; employee_id: string; weekday: number; starts_at: string; ends_at: string
  valid_from: string | null; valid_until: string | null; is_active: boolean; created_at: string; updated_at: string
}
export type TimeOffStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type TimeOff = {
  id: string; employee_id: string; starts_at: string; ends_at: string; reason: string | null
  status: TimeOffStatus; created_at: string; updated_at: string
}
