import http from '../../../lib/api-client'
import type { PageResponse } from '../../../types/api'
import type { Appointment, AppointmentInput, AppointmentStatus, AvailabilitySlot } from '../types'

export const availabilityApi = async (params: { location_id: string; service_id: string; date: string; employee_id?: string; slot_interval_minutes?: number }) =>
  (await http.get<AvailabilitySlot[]>('/api/v1/availability', { params })).data

export const appointmentsApi = {
  list: async (params: { location_id?: string; employee_id?: string; customer_id?: string; status?: AppointmentStatus; date_from?: string; date_to?: string; page?: number; page_size?: number } = {}) =>
    (await http.get<PageResponse<Appointment>>('/api/v1/appointments', { params })).data,
  get: async (id: string) => (await http.get<Appointment>(`/api/v1/appointments/${id}`)).data,
  create: async (input: AppointmentInput) => (await http.post<Appointment>('/api/v1/appointments', input)).data,
  updateNotes: async (id: string, notes: string | null) =>
    (await http.patch<Appointment>(`/api/v1/appointments/${id}`, { notes })).data,
  confirm: async (id: string) => (await http.post<Appointment>(`/api/v1/appointments/${id}/confirm`)).data,
  cancel: async (id: string, reason?: string) =>
    (await http.post<Appointment>(`/api/v1/appointments/${id}/cancel`, reason ? { cancellation_reason: reason } : undefined)).data,
  complete: async (id: string) => (await http.post<Appointment>(`/api/v1/appointments/${id}/complete`)).data,
  markNoShow: async (id: string) => (await http.post<Appointment>(`/api/v1/appointments/${id}/mark-no-show`)).data,
}
