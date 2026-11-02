import http from '../../../lib/api-client'
import type { MembershipRole, Tenant, TenantInvitation } from '../../tenants/types'

export const platformApi = {
  tenants: {
    list: async () => (await http.get<Tenant[]>('/api/v1/platform/tenants')).data,
    get: async (id: string) => (await http.get<Tenant>(`/api/v1/platform/tenants/${id}`)).data,
    create: async (input: { name: string; slug: string }) => (await http.post<Tenant>('/api/v1/platform/tenants', input)).data,
    update: async (id: string, input: { name?: string; is_active?: boolean }) =>
      (await http.patch<Tenant>(`/api/v1/platform/tenants/${id}`, input)).data,
    remove: async (id: string) => (await http.delete<Tenant>(`/api/v1/platform/tenants/${id}`)).data,
    invitations: async (id: string) => (await http.get<TenantInvitation[]>(`/api/v1/platform/tenants/${id}/invitations`)).data,
    invite: async (id: string, input: { email: string; role: MembershipRole }) =>
      (await http.post<TenantInvitation>(`/api/v1/platform/tenants/${id}/invitations`, input)).data,
  },
  revokeInvitation: async (id: string) =>
    (await http.post<TenantInvitation>(`/api/v1/platform/invitations/${id}/revoke`)).data,
}
