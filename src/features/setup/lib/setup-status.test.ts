import { describe, expect, it, vi } from 'vitest'
import { invalidateSetupStatus, needsEmployeeTarget, setupStatusQueryKey, setupStepRoutes } from './setup-status'

describe('setup status helpers', () => {
  it('conserve toujours le tenant dans la clé de cache', () => {
    expect(setupStatusQueryKey('tenant-a')).toEqual(['setup-status', 'tenant-a'])
    expect(setupStatusQueryKey('tenant-b')).toEqual(['setup-status', 'tenant-b'])
  })

  it('invalide uniquement le statut du tenant concerné', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)
    await invalidateSetupStatus({ invalidateQueries } as never, 'tenant-a')
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['setup-status', 'tenant-a'] })
  })

  it('dirige chaque étape vers une page existante', () => {
    expect(setupStepRoutes.location).toBe('/app/locations')
    expect(setupStepRoutes.opening_hours).toBe('/app/schedule')
    expect(setupStepRoutes.service).toBe('/app/services')
    expect(setupStepRoutes.employee).toBe('/app/employees')
    expect(needsEmployeeTarget('employee_service')).toBe(true)
    expect(needsEmployeeTarget('employee_availability')).toBe(true)
  })
})
