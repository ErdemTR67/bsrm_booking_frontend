import type { Tenant } from '../types'

export function chooseTenantId(tenants: Tenant[], storedTenantId: string | null) {
  if (storedTenantId && tenants.some((tenant) => tenant.id === storedTenantId)) return storedTenantId
  if (tenants.length === 1) return tenants[0].id
  return null
}
