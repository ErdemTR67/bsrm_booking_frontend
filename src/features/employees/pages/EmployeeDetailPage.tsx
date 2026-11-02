import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Avatar, Button, EmptyState, Field, FieldGroup, Input, LoadingState, Modal, PageHeader, Select, StatusBadge, WeekdayCheckboxes } from '../../../components/ui'
import { invalidateSetupStatus } from '../../setup/lib/setup-status'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { formatDateTime, formatMoney, formatTime, initials, toApiDateTime, toLocalDateTime, weekdays } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import { getCompatibleServices } from '../lib/service-assignment'
import type { EmployeeAvailability, TimeOff, TimeOffStatus } from '../types'

type Tab = 'services' | 'availability' | 'timeoff'
const availabilitySchema = z.object({
  weekday: z.number().min(0).max(6),
  weekdays: z.array(z.number()).min(1, 'Sélectionnez au moins un jour.'),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  permanent: z.boolean(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
}).superRefine((values, context) => {
  if (!values.permanent && !values.valid_from) {
    context.addIssue({ code: 'custom', path: ['valid_from'], message: 'Indiquez la date de début.' })
  }
})
type AvailabilityForm = z.infer<typeof availabilitySchema>
const timeOffSchema = z.object({ starts_at: z.string().min(1, 'Le début est requis.'), ends_at: z.string().min(1, 'La fin est requise.'), reason: z.string().optional(), status: z.enum(['pending', 'approved', 'rejected', 'cancelled']) })
type TimeOffForm = z.infer<typeof timeOffSchema>

export function EmployeeDetailPage() {
  const { employeeId = '' } = useParams(); const { selectedTenant } = useTenant(); const tenantId = selectedTenant!.id
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: Tab = requestedTab === 'availability' || requestedTab === 'timeoff' ? requestedTab : 'services'
  const setTab = (nextTab: Tab) => setSearchParams({ tab: nextTab })
  const [availabilityOpen, setAvailabilityOpen] = useState(false); const [timeOffOpen, setTimeOffOpen] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState<EmployeeAvailability | null>(null)
  const [editingTimeOff, setEditingTimeOff] = useState<TimeOff | null>(null)
  const employeeQuery = useQuery({ queryKey: ['employee', tenantId, employeeId], queryFn: () => api.employees.get(employeeId), enabled: Boolean(employeeId) })
  const servicesQuery = useQuery({ queryKey: ['services', tenantId, 'all'], queryFn: api.services.listAllActive })
  const associationsQuery = useQuery({ queryKey: ['employee-services', tenantId, employeeId], queryFn: () => api.employees.services(employeeId), enabled: Boolean(employeeId) })
  const availabilitiesQuery = useQuery({ queryKey: ['employee-availability', tenantId, employeeId], queryFn: () => api.employeeAvailability.list(employeeId), enabled: Boolean(employeeId) })
  const timeOffQuery = useQuery({ queryKey: ['time-off', tenantId, employeeId], queryFn: () => api.timeOff.list(employeeId), enabled: Boolean(employeeId) })
  const availabilityForm = useForm<AvailabilityForm>({ resolver: zodResolver(availabilitySchema), defaultValues: { weekday: 0, weekdays: [0, 1, 2, 3, 4], starts_at: '09:00', ends_at: '17:00', permanent: true, valid_from: '', valid_until: '' } })
  const timeOffForm = useForm<TimeOffForm>({ resolver: zodResolver(timeOffSchema), defaultValues: { starts_at: '', ends_at: '', reason: '', status: 'approved' } })
  const selectedWeekdays = useWatch({ control: availabilityForm.control, name: 'weekdays' })
  const permanentAvailability = useWatch({ control: availabilityForm.control, name: 'permanent' })
  const compatibleServices = getCompatibleServices(servicesQuery.data ?? [], employeeQuery.data?.location_id)

  const associationMutation = useMutation({ mutationFn: ({ serviceId, active }: { serviceId: string; active: boolean }) => active ? api.employees.saveService(employeeId, serviceId, {}) : api.employees.removeService(employeeId, serviceId), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['employee-services', tenantId, employeeId] }), invalidateSetupStatus(queryClient, tenantId)]); toastSuccess('Prestations du collaborateur mises à jour.') } })
  const allServicesMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const activeServiceIds = new Set((associationsQuery.data ?? []).filter((item) => item.is_active).map((item) => item.service_id))
      const targets = active ? compatibleServices : compatibleServices.filter((service) => activeServiceIds.has(service.id))
      const results = await Promise.allSettled(targets.map((service) => active ? api.employees.saveService(employeeId, service.id, {}) : api.employees.removeService(employeeId, service.id)))
      const failures = results.filter((result) => result.status === 'rejected')
      if (failures.length === results.length && failures[0]) throw failures[0].reason
      return { failed: failures[0]?.reason ?? null }
    },
    onSettled: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['employee-services', tenantId, employeeId] }), invalidateSetupStatus(queryClient, tenantId)])
    },
    onSuccess: ({ failed }) => {
      toastSuccess('Prestations du collaborateur mises à jour.')
      if (failed) toastError(failed, 'Certaines prestations n’ont pas pu être mises à jour.')
    },
  })
  const availabilityMutation = useMutation({
    mutationFn: async (values: AvailabilityForm) => {
      const dates = values.permanent
        ? { valid_from: null, valid_until: null }
        : { valid_from: values.valid_from || null, valid_until: values.valid_until || null }
      const common = { starts_at: `${values.starts_at}:00`, ends_at: `${values.ends_at}:00`, ...dates }
      if (editingAvailability) {
        await api.employeeAvailability.update(employeeId, editingAvailability.id, { ...common, weekday: values.weekday })
        return { saved: 1, failed: null }
      }
      const results = await Promise.allSettled(values.weekdays.map((weekday) => api.employeeAvailability.create(employeeId, { ...common, weekday })))
      const saved = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.find((result) => result.status === 'rejected')
      if (saved === 0 && failed) throw failed.reason
      return { saved, failed: failed?.reason ?? null }
    },
    onSuccess: async ({ saved, failed }) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['employee-availability', tenantId, employeeId] }), invalidateSetupStatus(queryClient, tenantId)])
      setAvailabilityOpen(false)
      setEditingAvailability(null)
      availabilityForm.reset()
      toastSuccess(saved > 1 ? `${saved} disponibilités enregistrées.` : 'Disponibilité enregistrée.')
      if (failed) toastError(failed, 'Certaines disponibilités n’ont pas pu être enregistrées.')
    },
  })
  const timeOffMutation = useMutation({ mutationFn: (values: TimeOffForm) => { const input = { starts_at: toApiDateTime(values.starts_at), ends_at: toApiDateTime(values.ends_at), reason: values.reason || null, status: values.status }; return editingTimeOff ? api.timeOff.update(employeeId, editingTimeOff.id, input) : api.timeOff.create(employeeId, input) }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['time-off', tenantId, employeeId] }); setTimeOffOpen(false); setEditingTimeOff(null); timeOffForm.reset(); toastSuccess(editingTimeOff ? 'Absence mise à jour.' : 'Absence ajoutée.') } })
  const statusMutation = useMutation({ mutationFn: ({ id, status }: { id: string; status: TimeOffStatus }) => api.timeOff.update(employeeId, id, { status }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['time-off', tenantId, employeeId] }); toastSuccess('Statut de l’absence mis à jour.') } })

  if (employeeQuery.isLoading) return <LoadingState />
  if (!employeeQuery.data) return <EmptyState title="Collaborateur introuvable" description="Cette fiche n’est plus accessible." action={<Link className="button button-secondary button-md" to="/app/employees">Retour à l’équipe</Link>} />
  const employee = employeeQuery.data
  const associations = associationsQuery.data ?? []
  const isAssociated = (serviceId: string) => associations.some((item) => item.service_id === serviceId && item.is_active)
  const allServicesSelected = compatibleServices.length > 0 && compatibleServices.every((service) => isAssociated(service.id))

  const openAvailability = (item?: EmployeeAvailability) => { setEditingAvailability(item ?? null); availabilityForm.reset(item ? { weekday: item.weekday, weekdays: [item.weekday], starts_at: item.starts_at.slice(0, 5), ends_at: item.ends_at.slice(0, 5), permanent: !item.valid_from && !item.valid_until, valid_from: item.valid_from ?? '', valid_until: item.valid_until ?? '' } : { weekday: 0, weekdays: [0, 1, 2, 3, 4], starts_at: '09:00', ends_at: '17:00', permanent: true, valid_from: '', valid_until: '' }); setAvailabilityOpen(true) }
  const openTimeOff = (item?: TimeOff) => { setEditingTimeOff(item ?? null); timeOffForm.reset(item ? { starts_at: toLocalDateTime(item.starts_at), ends_at: toLocalDateTime(item.ends_at), reason: item.reason ?? '', status: item.status } : { starts_at: '', ends_at: '', reason: '', status: 'approved' }); setTimeOffOpen(true) }
  const submitAvailability = availabilityForm.handleSubmit(async (values) => { try { await availabilityMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, availabilityForm.setError); toastError(error) } })
  const submitTimeOff = timeOffForm.handleSubmit(async (values) => { try { await timeOffMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, timeOffForm.setError); toastError(error) } })

  return <div className="page">
    <Link to="/app/employees" className="back-link">← Retour à l’équipe</Link>
    <PageHeader eyebrow="Fiche collaborateur" title={`${employee.first_name} ${employee.last_name}`} description={employee.email || 'Aucune adresse e-mail'} action={<Avatar initials={initials(employee.first_name, employee.last_name)} color={employee.display_color} />} />
    <div className="tabs"><button className={tab === 'services' ? 'tab-active' : ''} onClick={() => setTab('services')}>Prestations</button><button className={tab === 'availability' ? 'tab-active' : ''} onClick={() => setTab('availability')}>Disponibilités</button><button className={tab === 'timeoff' ? 'tab-active' : ''} onClick={() => setTab('timeoff')}>Absences</button></div>
    {tab === 'services' && <div className="card"><div className="card-header"><h2>Prestations réalisées</h2><div className="row-actions"><span className="result-count">{compatibleServices.filter((service) => isAssociated(service.id)).length} sur {compatibleServices.length}</span>{compatibleServices.length > 0 && <Button size="sm" variant="secondary" loading={allServicesMutation.isPending} onClick={() => allServicesMutation.mutate(!allServicesSelected, { onError: (error) => toastError(error) })}>{allServicesSelected ? 'Tout désactiver' : 'Tout activer'}</Button>}</div></div>{compatibleServices.length === 0 ? <div className="card-body"><EmptyState title="Aucune prestation compatible" description="Créez une prestation disponible dans cet établissement." /></div> : <div className="service-check-grid">{compatibleServices.map((service) => { const active = isAssociated(service.id); return <label className={`service-check ${active ? 'service-check-active' : ''}`} key={service.id}><input type="checkbox" checked={active} disabled={associationMutation.isPending || allServicesMutation.isPending} onChange={(event) => associationMutation.mutate({ serviceId: service.id, active: event.target.checked }, { onError: (error) => toastError(error) })} /><span><strong>{service.name}</strong><small>{service.duration_minutes} min · {formatMoney(service.price_cents, service.currency)}</small></span></label> })}</div>}</div>}
    {tab === 'availability' && <div className="card"><div className="card-header"><div><h2>Disponibilités hebdomadaires</h2></div><Button size="sm" onClick={() => openAvailability()}>+ Ajouter</Button></div>{!availabilitiesQuery.data?.length ? <div className="card-body"><EmptyState title="Aucune disponibilité" description="Ajoutez les plages pendant lesquelles ce collaborateur peut recevoir des rendez-vous." /></div> : <div className="compact-list">{availabilitiesQuery.data.map((item) => <div className="compact-row" key={item.id}><div><strong>{weekdays[item.weekday]}</strong><span>{formatTime(item.starts_at)} – {formatTime(item.ends_at)}</span></div><small>{item.valid_from ? `Du ${item.valid_from}` : 'Sans date de début'} {item.valid_until ? `au ${item.valid_until}` : ''}</small><div className="row-actions"><Button size="sm" variant="ghost" onClick={() => openAvailability(item)}>Modifier</Button><button className="icon-button" onClick={() => api.employeeAvailability.remove(employeeId, item.id).then(() => Promise.all([queryClient.invalidateQueries({ queryKey: ['employee-availability', tenantId, employeeId] }), invalidateSetupStatus(queryClient, tenantId)])).catch(toastError)}>×</button></div></div>)}</div>}</div>}
    {tab === 'timeoff' && <div className="card"><div className="card-header"><h2>Absences et congés</h2><Button size="sm" onClick={() => openTimeOff()}>+ Ajouter</Button></div>{!timeOffQuery.data?.length ? <div className="card-body"><EmptyState title="Aucune absence" description="Les congés approuvés bloqueront automatiquement les disponibilités." /></div> : <div className="compact-list">{timeOffQuery.data.map((item) => <div className="compact-row" key={item.id}><div><strong>{item.reason || 'Absence'}</strong><span>{formatDateTime(item.starts_at)} → {formatDateTime(item.ends_at)}</span></div><StatusBadge status={item.status} /><div className="row-actions"><Button size="sm" variant="ghost" onClick={() => openTimeOff(item)}>Modifier</Button>{item.status === 'pending' && <Button size="sm" variant="ghost" onClick={() => statusMutation.mutate({ id: item.id, status: 'approved' }, { onError: (error) => toastError(error) })}>Approuver</Button>}{item.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => api.timeOff.remove(employeeId, item.id).then(() => queryClient.invalidateQueries({ queryKey: ['time-off', tenantId, employeeId] })).catch(toastError)}>Annuler</Button>}</div></div>)}</div>}</div>}
    <Modal open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} title={editingAvailability ? 'Modifier la disponibilité' : 'Nouvelle disponibilité'}><form onSubmit={submitAvailability} noValidate><div className="form-grid">{editingAvailability ? <Field label="Jour" className="form-span-2"><Select {...availabilityForm.register('weekday', { valueAsNumber: true })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></Field> : <FieldGroup label="Jours" error={availabilityForm.formState.errors.weekdays?.message} className="form-span-2"><WeekdayCheckboxes value={selectedWeekdays} onChange={(value) => availabilityForm.setValue('weekdays', value, { shouldDirty: true, shouldValidate: true })} /></FieldGroup>}<Field label="Début"><Input type="time" {...availabilityForm.register('starts_at')} /></Field><Field label="Fin"><Input type="time" {...availabilityForm.register('ends_at')} /></Field><label className="check-card form-span-2"><input type="checkbox" {...availabilityForm.register('permanent')} /><span><strong>Horaire permanent</strong><small>Aucune limite de dates ne sera appliquée.</small></span></label>{!permanentAvailability && <><Field label="Valide du" error={availabilityForm.formState.errors.valid_from?.message}><Input type="date" {...availabilityForm.register('valid_from')} /></Field><Field label="Valide jusqu’au" hint="Facultatif"><Input type="date" {...availabilityForm.register('valid_until')} /></Field></>}</div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setAvailabilityOpen(false)}>Annuler</Button><Button type="submit" loading={availabilityMutation.isPending}>Enregistrer</Button></div></form></Modal>
    <Modal open={timeOffOpen} onClose={() => setTimeOffOpen(false)} title={editingTimeOff ? 'Modifier l’absence' : 'Ajouter une absence'}><form onSubmit={submitTimeOff}><div className="form-grid"><Field label="Début" error={timeOffForm.formState.errors.starts_at?.message}><Input type="datetime-local" {...timeOffForm.register('starts_at')} /></Field><Field label="Fin" error={timeOffForm.formState.errors.ends_at?.message}><Input type="datetime-local" {...timeOffForm.register('ends_at')} /></Field><Field label="Motif" className="form-span-2"><Input {...timeOffForm.register('reason')} /></Field><Field label="Statut" className="form-span-2"><Select {...timeOffForm.register('status')}><option value="pending">En attente</option><option value="approved">Approuvé</option><option value="rejected">Refusé</option><option value="cancelled">Annulé</option></Select></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setTimeOffOpen(false)}>Annuler</Button><Button type="submit" loading={timeOffMutation.isPending}>{editingTimeOff ? 'Enregistrer' : 'Ajouter'}</Button></div></form></Modal>
  </div>
}
