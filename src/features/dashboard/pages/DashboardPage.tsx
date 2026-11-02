import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { LoadingState, PageHeader, StatusBadge } from '../../../components/ui'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { formatDateTime } from '../../../lib/format'

export function DashboardPage() {
  const { selectedTenant } = useTenant(); const tenantId = selectedTenant!.id
  const start = new Date(); start.setHours(0, 0, 0, 0); const end = new Date(start.getTime() + 86_400_000)
  const appointmentsQuery = useQuery({ queryKey: ['appointments', tenantId, 'today'], queryFn: () => api.appointments.list({ date_from: start.toISOString(), date_to: end.toISOString(), page: 1, page_size: 100 }) })
  const employeesQuery = useQuery({ queryKey: ['employees', tenantId, 'dashboard'], queryFn: () => api.employees.list({ is_active: true, page: 1, page_size: 1 }) })
  const servicesQuery = useQuery({ queryKey: ['services', tenantId, 'dashboard'], queryFn: () => api.services.list({ is_active: true, page: 1, page_size: 1 }) })
  const customersQuery = useQuery({ queryKey: ['customers', tenantId, 'dashboard'], queryFn: () => api.customers.list({ page: 1, page_size: 1 }) })
  if (appointmentsQuery.isLoading) return <LoadingState />
  const appointments = appointmentsQuery.data?.items ?? []
  const confirmed = appointments.filter((item) => item.status === 'confirmed').length
  const pending = appointments.filter((item) => item.status === 'pending').length

  return <div className="page">
    <PageHeader eyebrow={selectedTenant!.name} title="Aujourd’hui" description={new Intl.DateTimeFormat('fr-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())} action={<Link className="button button-primary button-md" to="/app/availability">Nouveau rendez-vous</Link>} />
    <section className="dashboard-ledger" aria-label="Synthèse du jour">
      <div className="metric-primary"><span>Rendez-vous au programme</span><strong>{appointments.length}</strong><small>{confirmed} confirmé{confirmed > 1 ? 's' : ''} · {pending} en attente</small></div>
      <dl className="metric-register"><div><dt>Équipe active</dt><dd>{employeesQuery.data?.total ?? 'Indisponible'}</dd></div><div><dt>Clients enregistrés</dt><dd>{customersQuery.data?.total ?? 'Indisponible'}</dd></div><div><dt>Prestations actives</dt><dd>{servicesQuery.data?.total ?? 0}</dd></div></dl>
    </section>
    <div className="split-grid"><section className="card agenda-surface"><div className="card-header"><h2>Agenda du jour</h2><Link className="text-link" to="/app/appointments">Tous les rendez-vous</Link></div>{appointments.length ? <div className="dashboard-agenda">{appointments.slice(0, 6).map((appointment) => <Link to="/app/appointments" key={appointment.id}><time>{new Intl.DateTimeFormat('fr-BE', { hour: '2-digit', minute: '2-digit' }).format(new Date(appointment.starts_at))}</time><span><strong>{appointment.customer_name}</strong><small>{appointment.services.map((service) => service.service_name).join(', ')}</small></span><StatusBadge status={appointment.status} /></Link>)}</div> : <div className="dashboard-empty"><span>Agenda libre</span><p>Aucun rendez-vous n’est prévu aujourd’hui.</p></div>}</section><aside className="card quick-surface"><div className="card-header"><h2>Actions courantes</h2></div><div className="quick-links"><Link to="/app/availability"><span><strong>Créer un rendez-vous</strong><small>Rechercher un créneau disponible</small></span><b>01</b></Link><Link to="/app/customers"><span><strong>Ajouter un client</strong><small>Compléter le fichier clientèle</small></span><b>02</b></Link><Link to="/app/schedule"><span><strong>Modifier les horaires</strong><small>Planifier une fermeture</small></span><b>03</b></Link></div></aside></div>
    <p className="dashboard-footnote">Dernière actualisation : {formatDateTime(new Date().toISOString())}</p>
  </div>
}
