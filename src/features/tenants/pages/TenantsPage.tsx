import { Link, useNavigate } from 'react-router-dom'
import { EmptyState, LoadingState, PageHeader } from '../../../components/ui'
import { usePlatform } from '../../platform/context/platform-context'
import { useTenant } from '../context/tenant-context'

export function TenantsPage() {
  const { tenants, selectedTenant, selectTenant, isLoading } = useTenant()
  const { access: platformAccess } = usePlatform()
  const navigate = useNavigate()

  if (isLoading) return <LoadingState label="Chargement de vos entreprises…" />

  return (
    <div className="page">
      <PageHeader
        eyebrow="Organisation"
        title="Vos entreprises"
        description="Cette liste contient uniquement les entreprises auxquelles votre compte a été invité."
        action={platformAccess === 'granted' ? <Link className="button button-secondary button-md" to="/platform">Administration générale</Link> : undefined}
      />
      {tenants.length === 0 ? (
        <EmptyState
          title="Aucune entreprise accessible"
          description="Votre compte est actif, mais aucune entreprise ne lui est encore attribuée. Demandez une invitation à votre administrateur."
        />
      ) : (
        <div className="tenant-grid">
          {tenants.map((tenant) => {
            const active = selectedTenant?.id === tenant.id
            return (
              <button key={tenant.id} className={`tenant-card ${active ? 'tenant-card-active' : ''}`} onClick={() => { selectTenant(tenant.id); navigate('/app') }}>
                <span className="tenant-logo">{tenant.name.slice(0, 1).toUpperCase()}</span>
                <span><strong>{tenant.name}</strong><small>{active ? 'Entreprise sélectionnée' : 'Accès disponible'}</small></span>
                <i>{active ? 'Sélectionnée ✓' : 'Ouvrir →'}</i>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
