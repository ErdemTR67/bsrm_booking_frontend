export type Customer = {
  id: string; first_name: string; last_name: string; email: string | null; phone: string | null
  notes: string | null; marketing_consent: boolean; created_at: string; updated_at: string
}
export type CustomerInput = {
  first_name: string; last_name: string; email?: string | null; phone?: string | null
  notes?: string | null; marketing_consent?: boolean
}
