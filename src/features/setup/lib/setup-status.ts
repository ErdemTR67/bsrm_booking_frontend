import type { QueryClient } from '@tanstack/react-query'
import type { SetupStepKey } from '../types'

export const setupStepLabels: Record<SetupStepKey, string> = {
  location: 'Créer un établissement',
  opening_hours: 'Définir les horaires d’ouverture',
  service: 'Créer une prestation',
  employee: 'Ajouter un collaborateur réservable',
  employee_service: 'Associer une prestation au collaborateur',
  employee_availability: 'Définir les disponibilités du collaborateur',
}

export const setupStepRoutes: Record<SetupStepKey, string> = {
  location: '/app/locations',
  opening_hours: '/app/schedule',
  service: '/app/services',
  employee: '/app/employees',
  employee_service: '/app/employees',
  employee_availability: '/app/employees',
}

export function setupStatusQueryKey(tenantId: string) {
  return ['setup-status', tenantId] as const
}

export async function invalidateSetupStatus(queryClient: QueryClient, tenantId: string) {
  await queryClient.invalidateQueries({ queryKey: setupStatusQueryKey(tenantId) })
}

export function needsEmployeeTarget(step: SetupStepKey | null) {
  return step === 'employee_service' || step === 'employee_availability'
}
