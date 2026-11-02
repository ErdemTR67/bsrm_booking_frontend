import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { normalizeApiError } from '../../../lib/api-client'
import { useConfigurationAccess } from '../../../lib/configuration-access'
import { toastSuccess } from '../../../lib/toast'
import { useSetupStatus } from '../hooks/useSetupStatus'
import { needsEmployeeTarget, setupStepLabels, setupStepRoutes } from '../lib/setup-status'
import type { SetupStatus, SetupStepKey } from '../types'

async function findRelevantEmployee(tenantId: string, step: SetupStepKey) {
  const [locations, employeePage] = await Promise.all([
    api.locations.list(tenantId),
    api.employees.list({ is_active: true, is_bookable: true, page: 1, page_size: 100 }),
  ])
  const activeLocationIds = new Set(locations.filter((location) => location.is_active).map((location) => location.id))
  const employees = employeePage.items.filter((employee) => activeLocationIds.has(employee.location_id))
  if (step !== 'employee_availability') return employees[0]?.id ?? null

  for (const employee of employees) {
    const associations = await api.employees.services(employee.id)
    if (associations.some((association) => association.is_active)) return employee.id
  }
  return employees[0]?.id ?? null
}

export function SetupStatusBanner() {
  const { selectedTenantId } = useTenant()
  const statusQuery = useSetupStatus()
  const access = useConfigurationAccess(selectedTenantId)
  const navigate = useNavigate()
  const [collapsedByTenant, setCollapsedByTenant] = useState<Record<string, boolean>>({})
  const previousCompletion = useRef(new Map<string, boolean>())
  const status = statusQuery.data
  const nextStep = status?.next_step ?? null
  const employeeTargetQuery = useQuery({
    queryKey: ['setup-target-employee', selectedTenantId, nextStep],
    queryFn: () => findRelevantEmployee(selectedTenantId!, nextStep!),
    enabled: Boolean(selectedTenantId && status && !status.is_complete && needsEmployeeTarget(nextStep)),
    staleTime: 30_000,
    meta: { silentError: true },
  })

  useEffect(() => {
    if (!selectedTenantId || !status) return
    const previous = previousCompletion.current.get(selectedTenantId)
    if (previous === false && status.is_complete) {
      toastSuccess('Votre espace est prêt à recevoir des réservations.')
    }
    previousCompletion.current.set(selectedTenantId, status.is_complete)
  }, [selectedTenantId, status])

  if (!selectedTenantId || statusQuery.isPending) return null
  if (statusQuery.isError) {
    const error = normalizeApiError(statusQuery.error)
    if (error.status === 404 && error.code === 'tenant_not_found') return null
    return (
      <div className="setup-status-error" role="status">
        {error.status === 422
          ? 'Impossible de vérifier cet espace. Sélectionnez-le à nouveau.'
          : 'Le suivi de configuration est momentanément indisponible. Vous pouvez continuer à utiliser l’application.'}
      </div>
    )
  }
  if (!status || status.is_complete || !status.next_step) return null

  const collapsed = collapsedByTenant[selectedTenantId] ?? false
  const goToNextStep = () => {
    let destination = setupStepRoutes[status.next_step!]
    if (needsEmployeeTarget(status.next_step) && employeeTargetQuery.data) {
      const tab = status.next_step === 'employee_service' ? 'services' : 'availability'
      destination = `/app/employees/${employeeTargetQuery.data}?tab=${tab}`
    }
    navigate(destination)
  }

  return (
    <SetupProgressPanel
      status={status}
      collapsed={collapsed}
      canConfigure={access !== 'denied'}
      targetLoading={needsEmployeeTarget(status.next_step) && employeeTargetQuery.isPending}
      onToggle={() => setCollapsedByTenant((current) => ({ ...current, [selectedTenantId]: !collapsed }))}
      onContinue={goToNextStep}
    />
  )
}

export function SetupProgressPanel({ status, collapsed, canConfigure, targetLoading, onToggle, onContinue }: {
  status: SetupStatus
  collapsed: boolean
  canConfigure: boolean
  targetLoading?: boolean
  onToggle: () => void
  onContinue: () => void
}) {
  const nextLabel = status.next_step ? setupStepLabels[status.next_step] : ''

  return (
    <section className={`setup-banner ${collapsed ? 'setup-banner-collapsed' : ''}`} aria-labelledby="setup-banner-title">
      <div className="setup-banner-topline">
        <div>
          <span className="setup-kicker">Mise en route · {status.progress_percent}%</span>
          <h2 id="setup-banner-title">Configuration incomplète</h2>
          {!collapsed && <p>Terminez la configuration de votre espace pour recevoir des réservations.</p>}
        </div>
        <button type="button" className="setup-toggle" onClick={onToggle} aria-expanded={!collapsed}>
          {collapsed ? 'Afficher' : 'Réduire'}
        </button>
      </div>
      <div className="setup-progress" aria-label={`Configuration terminée à ${status.progress_percent}%`}>
        <span style={{ width: `${status.progress_percent}%` }} />
      </div>
      {!collapsed && (
        <div className="setup-banner-body">
          <ol className="setup-checklist">
            {status.steps.map((step) => (
              <li key={step.key} className={step.complete ? 'setup-step-complete' : ''}>
                <span aria-hidden="true">{step.complete ? '✓' : '○'}</span>
                {setupStepLabels[step.key]}
              </li>
            ))}
          </ol>
          <div className="setup-next-step">
            <span>Prochaine étape</span>
            <strong>{nextLabel}</strong>
            {canConfigure ? (
              <Button onClick={onContinue} loading={targetLoading}>Continuer la configuration</Button>
            ) : (
              <p>La configuration doit être terminée par un administrateur de l’espace.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
