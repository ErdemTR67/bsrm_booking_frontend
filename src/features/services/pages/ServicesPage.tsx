import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Pagination, Select, Textarea } from '../../../components/ui'
import { invalidateSetupStatus } from '../../setup/lib/setup-status'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { formatMoney } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import type { Service } from '../types'

const schema = z.object({
  name: z.string().trim().min(2, 'Le nom est requis.'), description: z.string().optional(), location_id: z.string().optional(),
  duration_minutes: z.number().int().min(1, 'La durée doit être positive.'),
  buffer_before_minutes: z.number().int().min(0), buffer_after_minutes: z.number().int().min(0),
  price_euros: z.string().regex(/^\d*(?:[.,]\d{0,2})?$/, 'Montant invalide.'), currency: z.string().length(3, 'Code à 3 lettres.'),
})
type ServiceForm = z.infer<typeof schema>
const defaults: ServiceForm = { name: '', description: '', location_id: '', duration_minutes: 30, buffer_before_minutes: 0, buffer_after_minutes: 0, price_euros: '', currency: 'EUR' }

export function ServicesPage() {
  const { selectedTenant } = useTenant()
  const [page, setPage] = useState(1)
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<Service | null>(null)
  const tenantId = selectedTenant!.id
  const servicesQuery = useQuery({ queryKey: ['services', tenantId, showInactive, page], queryFn: () => api.services.list({ is_active: !showInactive, page, page_size: 20 }) })
  const locationsQuery = useQuery({ queryKey: ['locations', tenantId, false], queryFn: () => api.locations.list(tenantId) })
  const form = useForm<ServiceForm>({ resolver: zodResolver(schema), defaultValues: defaults })

  useEffect(() => {
    form.reset(editing ? {
      name: editing.name, description: editing.description ?? '', location_id: editing.location_id ?? '', duration_minutes: editing.duration_minutes,
      buffer_before_minutes: editing.buffer_before_minutes, buffer_after_minutes: editing.buffer_after_minutes,
      price_euros: editing.price_cents === null ? '' : (editing.price_cents / 100).toFixed(2).replace('.', ','), currency: editing.currency,
    } : defaults)
  }, [editing, form])

  const saveMutation = useMutation({
    mutationFn: (values: ServiceForm) => {
      const input = {
        name: values.name, description: values.description || null, location_id: values.location_id || null,
        duration_minutes: values.duration_minutes, buffer_before_minutes: values.buffer_before_minutes,
        buffer_after_minutes: values.buffer_after_minutes,
        price_cents: values.price_euros ? Math.round(Number(values.price_euros.replace(',', '.')) * 100) : null,
        currency: values.currency.toUpperCase(),
      }
      return editing ? api.services.update(editing.id, input) : api.services.create(input)
    },
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['services', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); toastSuccess(editing ? 'Prestation mise à jour.' : 'Prestation créée.'); closeForm() },
  })
  const removeMutation = useMutation({
    mutationFn: api.services.remove,
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['services', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); setRemoving(null); toastSuccess('Prestation désactivée.') },
  })
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.services.update(id, { is_active: true }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['services', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); toastSuccess('Prestation réactivée.') },
  })
  function closeForm() { setFormOpen(false); setEditing(null); form.reset(defaults) }
  const submit = form.handleSubmit(async (values) => {
    try { await saveMutation.mutateAsync(values) }
    catch (error) { applyServerFieldErrors(error, form.setError); toastError(error, 'Impossible d’enregistrer cette prestation.') }
  })

  return (
    <div className="page">
      <PageHeader eyebrow={selectedTenant!.name} title="Prestations" description="Configurez vos services, leur durée, leur tarif et leurs temps de préparation." action={<Button onClick={() => { setEditing(null); setFormOpen(true) }}>+ Nouvelle prestation</Button>} />
      <div className="toolbar"><label className="toggle-label"><input type="checkbox" checked={showInactive} onChange={(event) => { setShowInactive(event.target.checked); setPage(1) }} />Afficher uniquement les prestations inactives</label></div>
      {servicesQuery.isLoading ? <LoadingState /> : !servicesQuery.data?.items.length ? <EmptyState title="Aucune prestation" description="Ajoutez une prestation pour commencer à calculer des disponibilités." action={<Button onClick={() => setFormOpen(true)}>Créer une prestation</Button>} /> : (
        <div className="card">
          <div className="data-table-head"><span>Prestation</span><span>Durée</span><span>Tarification</span><span>Actions</span></div>
          <div className="data-list">{servicesQuery.data.items.map((service) => (
            <div className="data-row" key={service.id}>
              <div className="data-main"><div><strong>{service.name}</strong><small>{service.description || 'Sans description'}</small></div></div>
              <div className="data-cell"><strong>{service.duration_minutes} min</strong><small>+{service.buffer_before_minutes} / +{service.buffer_after_minutes} min</small></div>
              <div className="data-cell"><strong>{formatMoney(service.price_cents, service.currency)}</strong><small>{service.location_id ? locationsQuery.data?.find((location) => location.id === service.location_id)?.name ?? 'Établissement' : 'Tous les établissements'}</small></div>
              <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => { setEditing(service); setFormOpen(true) }}>Modifier</Button>{service.is_active ? <button className="icon-button" title="Désactiver" onClick={() => setRemoving(service)}>×</button> : <Button size="sm" variant="secondary" loading={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(service.id, { onError: (error) => toastError(error) })}>Réactiver</Button>}</div>
            </div>
          ))}</div>
          <Pagination page={servicesQuery.data.page} pageSize={servicesQuery.data.page_size} total={servicesQuery.data.total} onPageChange={setPage} />
        </div>
      )}
      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Modifier la prestation' : 'Nouvelle prestation'} size="lg">
        <form onSubmit={submit} noValidate><div className="form-grid">
          <Field label="Nom" error={form.formState.errors.name?.message}><Input autoFocus {...form.register('name')} /></Field>
          <Field label="Établissement" hint="Laissez vide pour tous"><Select {...form.register('location_id')}><option value="">Tous les établissements</option>{locationsQuery.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></Field>
          <Field label="Description" className="form-span-2"><Textarea {...form.register('description')} /></Field>
          <Field label="Durée (minutes)" error={form.formState.errors.duration_minutes?.message}><Input type="number" min="1" {...form.register('duration_minutes', { valueAsNumber: true })} /></Field>
          <Field label="Prix (€)" error={form.formState.errors.price_euros?.message}><Input inputMode="decimal" placeholder="35,00" {...form.register('price_euros')} /></Field>
          <Field label="Préparation avant (min)"><Input type="number" min="0" {...form.register('buffer_before_minutes', { valueAsNumber: true })} /></Field>
          <Field label="Battement après (min)"><Input type="number" min="0" {...form.register('buffer_after_minutes', { valueAsNumber: true })} /></Field>
          <Field label="Devise"><Select {...form.register('currency')}><option value="EUR">Euro</option><option value="CHF">Franc suisse</option><option value="GBP">Livre sterling</option></Select></Field>
        </div><div className="modal-actions"><Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></div></form>
      </Modal>
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Désactiver cette prestation ?" message="Elle ne sera plus proposée lors de la recherche de disponibilités." confirmLabel="Désactiver" danger loading={removeMutation.isPending} onConfirm={() => removing && removeMutation.mutate(removing.id, { onError: (error) => toastError(error) })} />
    </div>
  )
}
