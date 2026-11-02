export type BookingSite = {
  id: string
  name: string
  key_prefix: string
  allowed_origins: string[]
  default_location_id: string | null
  slot_interval_minutes: number
  minimum_notice_minutes: number
  maximum_advance_days: number
  require_phone: boolean
  booking_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
export type BookingSiteIssued = BookingSite & { publishable_key: string }
export type BookingSiteInput = {
  name: string
  allowed_origins: string[]
  default_location_id: string | null
  slot_interval_minutes: number
  minimum_notice_minutes: number
  maximum_advance_days: number
  require_phone: boolean
  booking_enabled: boolean
}
