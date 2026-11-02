import http from '../../../lib/api-client'
import type { BookingSite, BookingSiteInput, BookingSiteIssued } from '../types'

export const bookingSiteApi = {
  get: async () => (await http.get<BookingSite>('/api/v1/booking-site')).data,
  create: async (input: BookingSiteInput) =>
    (await http.post<BookingSiteIssued>('/api/v1/booking-site', input)).data,
  update: async (input: Partial<BookingSiteInput>) =>
    (await http.patch<BookingSite>('/api/v1/booking-site', input)).data,
  rotateKey: async () =>
    (await http.post<BookingSiteIssued>('/api/v1/booking-site/rotate-key')).data,
}
