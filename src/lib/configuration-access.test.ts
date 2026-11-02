import { describe, expect, it } from 'vitest'
import { isConfigurationWriteRequest } from './configuration-access'

describe('isConfigurationWriteRequest', () => {
  it('reconnaît les mutations qui influencent la configuration', () => {
    expect(isConfigurationWriteRequest('/api/v1/services', 'post')).toBe(true)
    expect(isConfigurationWriteRequest('/api/v1/employees/e-1/services/s-1', 'put')).toBe(true)
    expect(isConfigurationWriteRequest('/api/v1/employees/e-1/availabilities/a-1', 'delete')).toBe(true)
    expect(isConfigurationWriteRequest('/api/v1/locations/l-1/opening-hours', 'post')).toBe(true)
    expect(isConfigurationWriteRequest('/api/v1/booking-site/rotate-key', 'post')).toBe(true)
  })

  it('ignore les lectures et les autres modules', () => {
    expect(isConfigurationWriteRequest('/api/v1/services', 'get')).toBe(false)
    expect(isConfigurationWriteRequest('/api/v1/customers', 'post')).toBe(false)
  })
})
