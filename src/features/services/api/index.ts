import http from '../../../lib/api-client'
import type { PageResponse } from '../../../types/api'
import type { Service, ServiceInput } from '../types'

export const servicesApi = {
  list: async (params: { is_active?: boolean; page?: number; page_size?: number } = {}) =>
    (await http.get<PageResponse<Service>>('/api/v1/services', { params })).data,
  listAllActive: async () => {
    const services: Service[] = []
    let page = 1
    while (true) {
      const response = (await http.get<PageResponse<Service>>('/api/v1/services', {
        params: { is_active: true, page, page_size: 100 },
      })).data
      services.push(...response.items)
      if (response.items.length === 0 || services.length >= response.total) return services
      page += 1
    }
  },
  get: async (id: string) => (await http.get<Service>(`/api/v1/services/${id}`)).data,
  create: async (input: ServiceInput) => (await http.post<Service>('/api/v1/services', input)).data,
  update: async (id: string, input: Partial<ServiceInput> & { is_active?: boolean }) =>
    (await http.patch<Service>(`/api/v1/services/${id}`, input)).data,
  remove: async (id: string) => (await http.delete<Service>(`/api/v1/services/${id}`)).data,
}
