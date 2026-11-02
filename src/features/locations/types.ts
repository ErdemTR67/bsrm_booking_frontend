export type Location = {
  id: string; tenant_id: string; name: string; slug: string; timezone: string
  address_line_1: string | null; address_line_2: string | null; postal_code: string | null
  city: string | null; country_code: string | null; is_active: boolean; created_at: string; updated_at: string
}

export type LocationInput = {
  name: string
  slug: string
  timezone?: string
  address_line_1?: string | null
  address_line_2?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
}
