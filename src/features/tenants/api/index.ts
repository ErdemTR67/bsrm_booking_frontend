import http from '../../../lib/api-client'
import type { Tenant } from '../types'

export const tenantsApi = {
  list: async () => (await http.get<Tenant[]>('/api/v1/tenants')).data,
  update: async (id: string, input: { name?: string; is_active?: boolean }) =>
    (await http.patch<Tenant>(`/api/v1/tenants/${id}`, input)).data,
  remove: async (id: string) => (await http.delete<Tenant>(`/api/v1/tenants/${id}`)).data,
}
