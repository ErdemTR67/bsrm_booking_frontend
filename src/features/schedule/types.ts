export type OpeningHour = {
  id: string; location_id: string; weekday: number; starts_at: string; ends_at: string
  is_active: boolean; created_at: string; updated_at: string
}
export type LocationClosure = {
  id: string; location_id: string; starts_at: string; ends_at: string; reason: string | null
  created_at: string; updated_at: string
}
