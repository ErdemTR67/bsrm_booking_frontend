import { describe, expect, it } from 'vitest'
import type { Service } from '../../services/types'
import { getCompatibleServices } from './service-assignment'

const service = (id: string, locationId: string | null): Service => ({
  id,
  location_id: locationId,
  name: id,
  description: null,
  duration_minutes: 30,
  buffer_before_minutes: 0,
  buffer_after_minutes: 0,
  price_cents: null,
  currency: 'EUR',
  is_active: true,
  created_at: '',
  updated_at: '',
})

describe('getCompatibleServices', () => {
  it('garde les prestations globales et celles du même établissement', () => {
    const services = [service('global', null), service('same', 'location-a'), service('other', 'location-b')]
    expect(getCompatibleServices(services, 'location-a').map((item) => item.id)).toEqual(['global', 'same'])
  })

  it('ne choisit rien sans établissement', () => {
    expect(getCompatibleServices([service('global', null)], null)).toEqual([])
  })
})
