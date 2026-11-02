import http from '../../../lib/api-client'
import type { Membership } from '../../tenants/types'
import type { TokenResponse, User } from '../types'

export const authApi = {
  acceptInvitation: async (input: { token: string; password: string; first_name: string; last_name: string }) =>
    (await http.post<User>('/api/v1/auth/invitations/accept', input)).data,
  acceptExistingInvitation: async (token: string) =>
    (await http.post<Membership>('/api/v1/auth/invitations/accept-existing', { token })).data,
  login: async (email: string, password: string) => {
    const body = new URLSearchParams({ username: email, password })
    return (await http.post<TokenResponse>('/api/v1/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })).data
  },
  logout: async (refreshToken: string) => { await http.post('/api/v1/auth/logout', { refresh_token: refreshToken }) },
  me: async () => (await http.get<User>('/api/v1/auth/me')).data,
}
