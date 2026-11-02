import { describe, expect, it } from 'vitest'
import { needsTenantHeader } from './api-client'

describe('needsTenantHeader', () => {
  it('ajoute le tenant uniquement aux modules métier tenant-scopés', () => {
    expect(needsTenantHeader('/api/v1/employees')).toBe(true)
    expect(needsTenantHeader('/api/v1/appointments')).toBe(true)
    expect(needsTenantHeader('/api/v1/setup/status')).toBe(true)
  })

  it('exclut auth, plateforme et routes tenant imbriquées', () => {
    expect(needsTenantHeader('/api/v1/auth/invitations/accept-existing')).toBe(false)
    expect(needsTenantHeader('/api/v1/platform/tenants')).toBe(false)
    expect(needsTenantHeader('/api/v1/tenants/tenant-id/locations')).toBe(false)
  })
})
