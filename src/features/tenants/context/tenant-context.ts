import { createContext, useContext } from 'react'
import type { Tenant } from '../types'

export type TenantContextValue = {
  tenants: Tenant[]
  selectedTenant: Tenant | null
  selectedTenantId: string | null
  isLoading: boolean
  selectTenant: (tenantId: string | null) => void
  refreshTenants: () => Promise<void>
}

export const TenantContext = createContext<TenantContextValue | null>(null)

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) throw new Error('useTenant doit être utilisé dans TenantProvider')
  return context
}
