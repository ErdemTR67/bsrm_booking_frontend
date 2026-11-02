import http from '../../../lib/api-client'
import type { PageResponse } from '../../../types/api'
import type { Customer, CustomerInput } from '../types'

export const customersApi = {
  list: async (params: { query?: string; email?: string; phone?: string; page?: number; page_size?: number } = {}) =>
    (await http.get<PageResponse<Customer>>('/api/v1/customers', { params })).data,
  get: async (id: string) => (await http.get<Customer>(`/api/v1/customers/${id}`)).data,
  create: async (input: CustomerInput) => (await http.post<Customer>('/api/v1/customers', input)).data,
  update: async (id: string, input: Partial<CustomerInput>) =>
    (await http.patch<Customer>(`/api/v1/customers/${id}`, input)).data,
  remove: async (id: string) => { await http.delete(`/api/v1/customers/${id}`) },
}
