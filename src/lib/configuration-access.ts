import { useSyncExternalStore } from 'react'

export type ConfigurationAccess = 'unknown' | 'granted' | 'denied'

const accessByTenant = new Map<string, ConfigurationAccess>()
const listeners = new Set<() => void>()

export function isConfigurationWriteRequest(url = '', method = 'get') {
  if (method.toLowerCase() === 'get') return false
  return [
    /^\/api\/v1\/booking-site(?:\/rotate-key)?$/,
    /^\/api\/v1\/tenants\/[^/]+\/locations(?:\/[^/]+)?$/,
    /^\/api\/v1\/employees(?:\/[^/]+)?$/,
    /^\/api\/v1\/services(?:\/[^/]+)?$/,
    /^\/api\/v1\/locations\/[^/]+\/opening-hours(?:\/[^/]+)?$/,
    /^\/api\/v1\/employees\/[^/]+\/services\/[^/]+$/,
    /^\/api\/v1\/employees\/[^/]+\/availabilities(?:\/[^/]+)?$/,
  ].some((pattern) => pattern.test(url))
}

export function setConfigurationAccess(tenantId: string, access: Exclude<ConfigurationAccess, 'unknown'>) {
  if (accessByTenant.get(tenantId) === access) return
  accessByTenant.set(tenantId, access)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useConfigurationAccess(tenantId: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => tenantId ? accessByTenant.get(tenantId) ?? 'unknown' : 'unknown',
    () => 'unknown',
  )
}
