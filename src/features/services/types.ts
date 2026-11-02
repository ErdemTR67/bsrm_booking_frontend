export type Service = {
  id: string; location_id: string | null; name: string; description: string | null; duration_minutes: number
  buffer_before_minutes: number; buffer_after_minutes: number; price_cents: number | null
  currency: string; is_active: boolean; created_at: string; updated_at: string
}

export type ServiceInput = {
  location_id?: string | null
  name: string
  description?: string | null
  duration_minutes: number
  buffer_before_minutes?: number
  buffer_after_minutes?: number
  price_cents?: number | null
  currency?: string
}
