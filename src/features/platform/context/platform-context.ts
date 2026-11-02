import { createContext, useContext } from 'react'
import type { Tenant } from '../../tenants/types'

export type PlatformAccess = 'checking' | 'granted' | 'denied' | 'error'

export type PlatformContextValue = {
  access: PlatformAccess
  tenants: Tenant[]
  isLoading: boolean
  refreshTenants: () => Promise<void>
}

export const PlatformContext = createContext<PlatformContextValue | null>(null)

export function usePlatform() {
  const context = useContext(PlatformContext)
  if (!context) throw new Error('usePlatform doit être utilisé dans PlatformProvider')
  return context
}
