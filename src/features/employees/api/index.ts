import http from '../../../lib/api-client'
import type { PageResponse } from '../../../types/api'
import type { Employee, EmployeeAvailability, EmployeeInput, EmployeeService, TimeOff, TimeOffStatus } from '../types'

export const employeesApi = {
  list: async (params: { location_id?: string; is_active?: boolean; is_bookable?: boolean; page?: number; page_size?: number } = {}) =>
    (await http.get<PageResponse<Employee>>('/api/v1/employees', { params })).data,
  get: async (id: string) => (await http.get<Employee>(`/api/v1/employees/${id}`)).data,
  create: async (input: EmployeeInput) => (await http.post<Employee>('/api/v1/employees', input)).data,
  update: async (id: string, input: Partial<EmployeeInput> & { is_active?: boolean }) =>
    (await http.patch<Employee>(`/api/v1/employees/${id}`, input)).data,
  remove: async (id: string) => (await http.delete<Employee>(`/api/v1/employees/${id}`)).data,
  services: async (employeeId: string) =>
    (await http.get<EmployeeService[]>(`/api/v1/employees/${employeeId}/services`)).data,
  saveService: async (employeeId: string, serviceId: string, input: { custom_duration_minutes?: number | null; custom_price_cents?: number | null; is_active?: boolean }) =>
    (await http.put<EmployeeService>(`/api/v1/employees/${employeeId}/services/${serviceId}`, input)).data,
  removeService: async (employeeId: string, serviceId: string) =>
    (await http.delete<EmployeeService>(`/api/v1/employees/${employeeId}/services/${serviceId}`)).data,
}

export const employeeAvailabilityApi = {
  list: async (employeeId: string, isActive = true) =>
    (await http.get<EmployeeAvailability[]>(`/api/v1/employees/${employeeId}/availabilities`, { params: { is_active: isActive } })).data,
  create: async (employeeId: string, input: { weekday: number; starts_at: string; ends_at: string; valid_from?: string | null; valid_until?: string | null }) =>
    (await http.post<EmployeeAvailability>(`/api/v1/employees/${employeeId}/availabilities`, input)).data,
  update: async (employeeId: string, id: string, input: Partial<{ weekday: number; starts_at: string; ends_at: string; valid_from: string | null; valid_until: string | null; is_active: boolean }>) =>
    (await http.patch<EmployeeAvailability>(`/api/v1/employees/${employeeId}/availabilities/${id}`, input)).data,
  remove: async (employeeId: string, id: string) =>
    (await http.delete<EmployeeAvailability>(`/api/v1/employees/${employeeId}/availabilities/${id}`)).data,
}

export const timeOffApi = {
  list: async (employeeId: string, status?: TimeOffStatus) =>
    (await http.get<TimeOff[]>(`/api/v1/employees/${employeeId}/time-off`, { params: status ? { status } : undefined })).data,
  create: async (employeeId: string, input: { starts_at: string; ends_at: string; reason?: string | null; status?: TimeOffStatus }) =>
    (await http.post<TimeOff>(`/api/v1/employees/${employeeId}/time-off`, input)).data,
  update: async (employeeId: string, id: string, input: Partial<{ starts_at: string; ends_at: string; reason: string | null; status: TimeOffStatus }>) =>
    (await http.patch<TimeOff>(`/api/v1/employees/${employeeId}/time-off/${id}`, input)).data,
  remove: async (employeeId: string, id: string) =>
    (await http.delete<TimeOff>(`/api/v1/employees/${employeeId}/time-off/${id}`)).data,
}
