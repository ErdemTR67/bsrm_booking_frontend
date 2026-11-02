import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Select } from '../../../components/ui'
import { invalidateSetupStatus } from '../../setup/lib/setup-status'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { getBrowserTimeZone, nextAvailableSlug } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import type { Location } from '../types'

const schema = z.object({
  name: z.string().trim().min(2, 'Le nom est requis.'),
  address_line_1: z.string().optional(), address_line_2: z.string().optional(),
  postal_code: z.string().optional(), city: z.string().optional(),
  country_code: z.string().trim().length(2, 'Sélectionnez un pays.'),
})
type LocationForm = z.infer<typeof schema>

const defaults: LocationForm = { name: '', address_line_1: '', address_line_2: '', postal_code: '', city: '', country_code: 'BE' }

export function LocationsPage() {
  const { selectedTenant } = useTenant()
  const [includeInactive, setIncludeInactive] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<Location | null>(null)
  const tenantId = selectedTenant!.id
  const locationsQuery = useQuery({ queryKey: ['locations', tenantId, true], queryFn: () => api.locations.list(tenantId, true) })
  const form = useForm<LocationForm>({ resolver: zodResolver(schema), defaultValues: defaults })

  useEffect(() => {
    if (editing) form.reset({
      name: editing.name,
      address_line_1: editing.address_line_1 ?? '', address_line_2: editing.address_line_2 ?? '',
      postal_code: editing.postal_code ?? '', city: editing.city ?? '', country_code: editing.country_code ?? 'BE',
    })
    else form.reset(defaults)
  }, [editing, form])

  const saveMutation = useMutation({
    mutationFn: (values: LocationForm) => {
      const input = normalize(values)
      if (editing) return api.locations.update(tenantId, editing.id, input)
      return api.locations.create(tenantId, {
        ...input,
        slug: nextAvailableSlug(values.name, locationsQuery.data?.map((location) => location.slug) ?? [], 'etablissement'),
        timezone: getBrowserTimeZone(),
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['locations', tenantId] }),
        invalidateSetupStatus(queryClient, tenantId),
      ])
      toastSuccess(editing ? 'Établissement mis à jour.' : 'Établissement créé.')
      closeForm()
    },
  })
  const removeMutation = useMutation({
    mutationFn: (id: string) => api.locations.remove(tenantId, id),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['locations', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); setRemoving(null); toastSuccess('Établissement désactivé.') },
  })
  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.locations.update(tenantId, id, { is_active: true }),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['locations', tenantId] }), invalidateSetupStatus(queryClient, tenantId)]); toastSuccess('Établissement réactivé.') },
  })

  function normalize(values: LocationForm) {
    return { ...values, country_code: values.country_code.toUpperCase(), address_line_1: values.address_line_1 || null, address_line_2: values.address_line_2 || null, postal_code: values.postal_code || null, city: values.city || null }
  }
  function closeForm() { setFormOpen(false); setEditing(null); form.reset(defaults) }
  const submit = form.handleSubmit(async (values) => {
    try { await saveMutation.mutateAsync(values) }
    catch (error) { applyServerFieldErrors(error, form.setError); toastError(error, 'Impossible d’enregistrer cet établissement.') }
  })
  const visibleLocations = includeInactive ? locationsQuery.data : locationsQuery.data?.filter((location) => location.is_active)

  return (
    <div className="page">
      <PageHeader eyebrow={selectedTenant!.name} title="Établissements" description="Gérez vos lieux d’accueil et leurs coordonnées." action={<Button onClick={() => { setEditing(null); setFormOpen(true) }}>+ Nouvel établissement</Button>} />
      <div className="toolbar"><label className="toggle-label"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />Afficher les établissements désactivés</label></div>
      {locationsQuery.isLoading ? <LoadingState /> : !visibleLocations?.length ? (
        <EmptyState title="Aucun établissement" description="Créez un premier lieu pour pouvoir ajouter une équipe et des horaires." action={<Button onClick={() => setFormOpen(true)}>Créer un établissement</Button>} />
      ) : (
        <div className="card data-list">
          <div className="data-table-head"><span>Établissement</span><span>Adresse</span><span>Statut</span><span>Actions</span></div>
          {visibleLocations.map((location) => (
            <div className="data-row" key={location.id}>
              <div className="data-main"><span className="location-pin">⌖</span><div><strong>{location.name}</strong><small>{location.address_line_1 || 'Adresse à compléter'}</small></div></div>
              <div className="data-cell">{[location.postal_code, location.city].filter(Boolean).join(' ') || 'Adresse à compléter'}<small>{location.country_code}</small></div>
              <div className="data-cell"><span className={`badge ${location.is_active ? 'badge-active' : 'badge-inactive'}`}>{location.is_active ? 'Actif' : 'Désactivé'}</span></div>
              <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => { setEditing(location); setFormOpen(true) }}>Modifier</Button>{location.is_active ? <button className="icon-button" onClick={() => setRemoving(location)} title="Désactiver">×</button> : <Button size="sm" variant="secondary" loading={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(location.id, { onError: (error) => toastError(error) })}>Réactiver</Button>}</div>
            </div>
          ))}
        </div>
      )}
      <Modal open={formOpen} onClose={closeForm} title={editing ? 'Modifier l’établissement' : 'Nouvel établissement'} size="lg">
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Nom" error={form.formState.errors.name?.message} className="form-span-2"><Input autoFocus {...form.register('name')} /></Field>
            <Field label="Adresse" error={form.formState.errors.address_line_1?.message} className="form-span-2"><Input {...form.register('address_line_1')} /></Field>
            <Field label="Complément"><Input {...form.register('address_line_2')} /></Field>
            <Field label="Ville"><Input {...form.register('city')} /></Field>
            <Field label="Code postal"><Input {...form.register('postal_code')} /></Field>
            <Field label="Pays"><Select {...form.register('country_code')}><option value="BE">Belgique</option><option value="FR">France</option><option value="LU">Luxembourg</option><option value="NL">Pays-Bas</option><option value="DE">Allemagne</option><option value="CH">Suisse</option></Select></Field>
          </div>
          <div className="modal-actions"><Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></div>
        </form>
      </Modal>
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Désactiver cet établissement ?" message="Il disparaîtra des listes actives mais pourra être réactivé ultérieurement." confirmLabel="Désactiver" danger loading={removeMutation.isPending} onConfirm={() => removing && removeMutation.mutate(removing.id, { onError: (error) => toastError(error) })} />
    </div>
  )
}
