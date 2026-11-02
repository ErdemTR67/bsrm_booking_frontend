import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/context/auth-context'
import { api } from '../../../lib/api'
import { normalizeApiError } from '../../../lib/api-client'
import { queryClient } from '../../../lib/query-client'
import { PlatformContext } from './platform-context'
import type { PlatformAccess } from './platform-context'

export function PlatformProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const platformQuery = useQuery({
    queryKey: ['platform', 'tenants', user?.id],
    queryFn: api.platform.tenants.list,
    enabled: status === 'authenticated',
    retry: false,
    meta: { silentError: true },
  })

  const access: PlatformAccess = useMemo(() => {
    if (status !== 'authenticated' || platformQuery.isLoading) return 'checking'
    if (platformQuery.isSuccess) return 'granted'
    if (platformQuery.isError && normalizeApiError(platformQuery.error).status === 403) return 'denied'
    return 'error'
  }, [platformQuery.error, platformQuery.isError, platformQuery.isLoading, platformQuery.isSuccess, status])

  const value = useMemo(() => ({
    access,
    tenants: platformQuery.data ?? [],
    isLoading: platformQuery.isLoading,
    refreshTenants: async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] }) },
  }), [access, platformQuery.data, platformQuery.isLoading])

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
}
