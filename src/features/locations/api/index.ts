import http from '../../../lib/api-client'
import type { Location, LocationInput } from '../types'

export const locationsApi = {
  list: async (tenantId: string, includeInactive = false) =>
    (await http.get<Location[]>(`/api/v1/tenants/${tenantId}/locations`, { params: { include_inactive: includeInactive } })).data,
  get: async (tenantId: string, id: string) => (await http.get<Location>(`/api/v1/tenants/${tenantId}/locations/${id}`)).data,
  create: async (tenantId: string, input: LocationInput) =>
    (await http.post<Location>(`/api/v1/tenants/${tenantId}/locations`, input)).data,
  update: async (tenantId: string, id: string, input: Partial<LocationInput> & { is_active?: boolean }) =>
    (await http.patch<Location>(`/api/v1/tenants/${tenantId}/locations/${id}`, input)).data,
  remove: async (tenantId: string, id: string) =>
    (await http.delete<Location>(`/api/v1/tenants/${tenantId}/locations/${id}`)).data,
}
