import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Pagination, Select } from '../../../components/ui'
import { invalidateSetupStatus } from '../../setup/lib/setup-status'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { initials } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import { getCompatibleServices } from '../lib/service-assignment'
import type { Employee } from '../types'

const schema = z.object({
  location_id: z.string().min(1, 'Sélectionnez un établissement.'), first_name: z.string().trim().min(1, 'Le prénom est requis.'),
  last_name: z.string().trim().min(1, 'Le nom est requis.'), email: z.union([z.string().trim().email('Adresse e-mail invalide.'), z.literal('')]),
  phone: z.string().optional(), display_color: z.string(), is_bookable: z.boolean(), assign_all_services: z.boolean(),
})
type EmployeeForm = z.infer<typeof schema>
const defaults: EmployeeForm = { location_id: '', first_name: '', last_name: '', email: '', phone: '', display_color: '#8074C8', is_bookable: true, assign_all_services: true }

export function EmployeesPage() {
  const { selectedTenant } = useTenant(); const tenantId = selectedTenant!.id
  const [locationFilter, setLocationFilter] = useState(''); const [page, setPage] = useState(1)
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null); const [formOpen, setFormOpen] = useState(false); const [removing, setRemoving] = useState<Employee | null>(null)
  const locationsQuery = useQuery({ queryKey: ['locations', tenantId, false], queryFn: () => api.locations.list(tenantId) })
  const employeesQuery = useQuery({ queryKey: ['employees', tenantId, locationFilter, showInactive, page], queryFn: () => api.employees.list({ location_id: locationFilter || undefined, is_active: !showInactive, page, page_size: 20 }) })
  const form = useForm<EmployeeForm>({ resolver: zodResolver(schema), defaultValues: defaults })
  useEffect(() => { form.reset(editing ? { location_id: editing.location_id, first_name: editing.first_name, last_name: editing.last_name, email: editing.email ?? '', phone: editing.phone ?? '', display_color: editing.display_color ?? '#8074C8', is_bookable: editing.is_bookable, assign_all_services: true } : { ...defaults, location_id: locationsQuery.data?.[0]?.id ?? '' }) }, [editing, form, locationsQuery.data])
  const saveMutation = useMutation({
    mutationFn: async (values: EmployeeForm) => {
      const { assign_all_services: assignAllServices, ...employeeValues } = values
      const input = { ...employeeValues, email: values.email || null, phone: values.phone || null, display_color: values.display_color || null }
      if (editing) return { employee: await api.employees.update(editing.id, input), associationError: null }

      const employee = await api.employees.create(input)
      let associationError: unknown = null
      if (assignAllServices) {
        try {
          const services = getCompatibleServices(await api.services.listAllActive(), employee.location_id)
          const results = await Promise.allSettled(services.map((service) => api.employees.saveService(employee.id, service.id, {})))
          associationError = results.find((result) => result.status === 'rejected')?.reason ?? null
        } catch (error) {
          associationError = error
        }
      }
      return { employee, associationError }
    },
    onSuccess: async ({ employee, associationError }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['employees', tenantId] }),
        queryClient.invalidateQueries({ queryKey: ['employee-services', tenantId, employee.id] }),
        invalidateSetupStatus(queryClient, tenantId),
      ])
      toastSuccess(editing ? 'Collaborateur mis à jour.' : 'Collaborateur ajouté.')
      if (associationError) toastError(associationError, 'Le collaborateur a été ajouté, mais certaines prestations n’ont pas pu être activées.')
      closeForm()
    },
  })
  const removeMutation = useMutation({ mutationFn: api.employees.remove, onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['employees', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); setRemoving(null); toastSuccess('Collaborateur désactivé.') } })
  const reactivateMutation = useMutation({ mutationFn: (id: string) => api.employees.update(id, { is_active: true }), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['employees', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); toastSuccess('Collaborateur réactivé.') } })
  function closeForm() { setEditing(null); setFormOpen(false); form.reset(defaults) }
  const submit = form.handleSubmit(async (values) => { try { await saveMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, form.setError); toastError(error, 'Impossible d’enregistrer ce collaborateur.') } })
  const locationName = (id: string) => locationsQuery.data?.find((location) => location.id === id)?.name ?? 'Établissement'

  return <div className="page">
    <PageHeader eyebrow={selectedTenant!.name} title="Équipe" description="Gérez vos collaborateurs, leurs prestations et leurs disponibilités." action={<Button onClick={() => { setEditing(null); setFormOpen(true) }}>+ Nouveau collaborateur</Button>} />
    <div className="toolbar"><Select aria-label="Filtrer par établissement" value={locationFilter} onChange={(event) => { setLocationFilter(event.target.value); setPage(1) }}><option value="">Tous les établissements</option>{locationsQuery.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select><span className="toolbar-spacer" /><label className="toggle-label"><input type="checkbox" checked={showInactive} onChange={(event) => { setShowInactive(event.target.checked); setPage(1) }} />Afficher uniquement les inactifs</label></div>
    {employeesQuery.isLoading ? <LoadingState /> : !employeesQuery.data?.items.length ? <EmptyState title="Aucun collaborateur" description="Ajoutez un collaborateur réservable à votre équipe." action={<Button onClick={() => setFormOpen(true)}>Ajouter un collaborateur</Button>} /> : <div className="card"><div className="data-table-head"><span>Collaborateur</span><span>Établissement</span><span>Disponibilité</span><span>Actions</span></div><div className="data-list">{employeesQuery.data.items.map((employee) => <div className="data-row" key={employee.id}>
      <div className="data-main"><Avatar initials={initials(employee.first_name, employee.last_name)} color={employee.display_color} /><div><strong>{employee.first_name} {employee.last_name}</strong><small>{employee.email || 'Aucune adresse e-mail'}</small></div></div>
      <div className="data-cell">{locationName(employee.location_id)}<small>Établissement</small></div>
      <div className="data-cell"><span className={`badge ${employee.is_bookable ? 'badge-active' : 'badge-inactive'}`}>{employee.is_bookable ? 'Réservable' : 'Non réservable'}</span><small>{employee.phone || 'Sans téléphone'}</small></div>
      <div className="row-actions">{employee.is_active && <Link className="button button-ghost button-sm" to={`/app/employees/${employee.id}`}>Planning</Link>}<Button size="sm" variant="ghost" onClick={() => { setEditing(employee); setFormOpen(true) }}>Modifier</Button>{employee.is_active ? <button className="icon-button" title="Désactiver" onClick={() => setRemoving(employee)}>×</button> : <Button size="sm" variant="secondary" loading={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(employee.id, { onError: (error) => toastError(error) })}>Réactiver</Button>}</div>
    </div>)}</div><Pagination page={employeesQuery.data.page} pageSize={employeesQuery.data.page_size} total={employeesQuery.data.total} onPageChange={setPage} /></div>}
    <Modal open={formOpen} onClose={closeForm} title={editing ? 'Modifier le collaborateur' : 'Nouveau collaborateur'} size="lg"><form onSubmit={submit} noValidate><div className="form-grid">
      <Field label="Prénom" error={form.formState.errors.first_name?.message}><Input autoFocus {...form.register('first_name')} /></Field><Field label="Nom" error={form.formState.errors.last_name?.message}><Input {...form.register('last_name')} /></Field>
      <Field label="Établissement" error={form.formState.errors.location_id?.message} className="form-span-2"><Select {...form.register('location_id')}><option value="">Sélectionner…</option>{locationsQuery.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field><Field label="Téléphone"><Input type="tel" {...form.register('phone')} /></Field>
      <Field label="Couleur d’agenda"><Input type="color" {...form.register('display_color')} /></Field><label className="check-card"><input type="checkbox" {...form.register('is_bookable')} /><span><strong>Réservable en ligne</strong><small>Apparaît dans les disponibilités.</small></span></label>
      {!editing && <label className="check-card form-span-2"><input type="checkbox" {...form.register('assign_all_services')} /><span><strong>Activer toutes les prestations compatibles</strong><small>Les prestations de cet établissement seront associées automatiquement.</small></span></label>}
    </div><div className="modal-actions"><Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Enregistrer' : 'Ajouter'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Désactiver ce collaborateur ?" message="Il ne sera plus proposé dans les nouveaux créneaux disponibles." confirmLabel="Désactiver" danger loading={removeMutation.isPending} onConfirm={() => removing && removeMutation.mutate(removing.id, { onError: (error) => toastError(error) })} />
  </div>
}
