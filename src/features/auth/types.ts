export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
  expires_in: number
  refresh_expires_in: number
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}
