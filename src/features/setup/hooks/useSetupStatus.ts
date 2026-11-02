import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { normalizeApiError } from '../../../lib/api-client'
import { toastError } from '../../../lib/toast'
import { setupStatusQueryKey } from '../lib/setup-status'

export function useSetupStatus() {
  const { selectedTenantId, selectTenant, refreshTenants } = useTenant()
  const handledMissingTenant = useRef<string | null>(null)
  const query = useQuery({
    queryKey: setupStatusQueryKey(selectedTenantId ?? ''),
    queryFn: () => api.setup.status(selectedTenantId!),
    enabled: Boolean(selectedTenantId),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    meta: { silentError: true },
  })

  useEffect(() => {
    if (!selectedTenantId || !query.error) return
    const error = normalizeApiError(query.error)
    if (error.status !== 404 || error.code !== 'tenant_not_found' || handledMissingTenant.current === selectedTenantId) return

    handledMissingTenant.current = selectedTenantId
    toastError(error)
    selectTenant(null)
    void refreshTenants()
  }, [query.error, refreshTenants, selectTenant, selectedTenantId])

  return query
}
