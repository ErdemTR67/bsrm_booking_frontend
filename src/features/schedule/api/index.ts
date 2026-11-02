import http from '../../../lib/api-client'
import type { LocationClosure, OpeningHour } from '../types'

export const openingHoursApi = {
  list: async (locationId: string, isActive = true) =>
    (await http.get<OpeningHour[]>(`/api/v1/locations/${locationId}/opening-hours`, { params: { is_active: isActive } })).data,
  create: async (locationId: string, input: { weekday: number; starts_at: string; ends_at: string }) =>
    (await http.post<OpeningHour>(`/api/v1/locations/${locationId}/opening-hours`, input)).data,
  update: async (locationId: string, id: string, input: Partial<{ weekday: number; starts_at: string; ends_at: string; is_active: boolean }>) =>
    (await http.patch<OpeningHour>(`/api/v1/locations/${locationId}/opening-hours/${id}`, input)).data,
  remove: async (locationId: string, id: string) =>
    (await http.delete<OpeningHour>(`/api/v1/locations/${locationId}/opening-hours/${id}`)).data,
}

export const closuresApi = {
  list: async (locationId: string) =>
    (await http.get<LocationClosure[]>(`/api/v1/locations/${locationId}/closures`)).data,
  create: async (locationId: string, input: { starts_at: string; ends_at: string; reason?: string | null }) =>
    (await http.post<LocationClosure>(`/api/v1/locations/${locationId}/closures`, input)).data,
  update: async (locationId: string, id: string, input: Partial<{ starts_at: string; ends_at: string; reason: string | null }>) =>
    (await http.patch<LocationClosure>(`/api/v1/locations/${locationId}/closures/${id}`, input)).data,
  remove: async (locationId: string, id: string) => { await http.delete(`/api/v1/locations/${locationId}/closures/${id}`) },
}
