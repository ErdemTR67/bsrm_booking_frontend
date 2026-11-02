import type { Service } from '../../services/types'

export function getCompatibleServices(services: Service[], locationId: string | null | undefined) {
  if (!locationId) return []
  return services.filter((service) => service.location_id === null || service.location_id === locationId)
}
