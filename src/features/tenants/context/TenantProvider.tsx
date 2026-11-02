import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../auth/context/auth-context'
import { api } from '../../../lib/api'
import { getSelectedTenantId, saveSelectedTenantId } from '../../../lib/auth'
import { queryClient } from '../../../lib/query-client'
import { chooseTenantId } from '../lib/tenant-selection'
import { TenantContext } from './tenant-context'

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <TenantProviderState key={user?.id ?? 'guest'}>{children}</TenantProviderState>
}

function TenantProviderState({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const [preferredTenantId, setPreferredTenantId] = useState<string | null>(getSelectedTenantId)
  const [selectionCleared, setSelectionCleared] = useState(false)
  const tenantsQuery = useQuery({
    queryKey: ['tenants'],
    queryFn: api.tenants.list,
    enabled: status === 'authenticated',
  })

  const tenants = useMemo(() => tenantsQuery.data ?? [], [tenantsQuery.data])
  const selectedTenantId = useMemo(() => {
    if (status !== 'authenticated') return null
    if (selectionCleared) return null
    if (!tenantsQuery.data) return preferredTenantId
    return chooseTenantId(tenantsQuery.data, preferredTenantId)
  }, [preferredTenantId, selectionCleared, status, tenantsQuery.data])
  const selectedTenant = useMemo(() => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null, [selectedTenantId, tenants])

  const selectTenant = useCallback((tenantId: string | null) => {
    saveSelectedTenantId(tenantId)
    setPreferredTenantId(tenantId)
    setSelectionCleared(tenantId === null)
    void queryClient.cancelQueries({ predicate: (query) => !['tenants', 'platform'].includes(String(query.queryKey[0])) })
    queryClient.removeQueries({ predicate: (query) => !['tenants', 'platform'].includes(String(query.queryKey[0])) })
  }, [])

  useEffect(() => {
    saveSelectedTenantId(selectedTenantId)
  }, [selectedTenantId])

  const refreshTenants = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenants'] })
  }, [])

  const value = useMemo(() => ({
    tenants,
    selectedTenant,
    selectedTenantId,
    isLoading: tenantsQuery.isLoading,
    selectTenant,
    refreshTenants,
  }), [tenants, selectedTenant, selectedTenantId, tenantsQuery.isLoading, selectTenant, refreshTenants])

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
