import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button, ConfirmDialog, EmptyState, Field, FieldGroup, Input, LoadingState, Modal, PageHeader, Select, WeekdayCheckboxes } from '../../../components/ui'
import { invalidateSetupStatus } from '../../setup/lib/setup-status'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { formatDateTime, formatTime, toApiDateTime, toLocalDateTime, weekdays } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import type { LocationClosure, OpeningHour } from '../types'

const hourSchema = z.object({ weekday: z.number().min(0).max(6), weekdays: z.array(z.number()).min(1, 'Sélectionnez au moins un jour.'), starts_at: z.string().min(1), ends_at: z.string().min(1) })
type HourForm = z.infer<typeof hourSchema>
const closureSchema = z.object({ starts_at: z.string().min(1, 'Le début est requis.'), ends_at: z.string().min(1, 'La fin est requise.'), reason: z.string().optional() })
type ClosureForm = z.infer<typeof closureSchema>

export function SchedulePage() {
  const { selectedTenant } = useTenant(); const tenantId = selectedTenant!.id
  const [locationId, setLocationId] = useState(''); const [tab, setTab] = useState<'hours' | 'closures'>('hours')
  const [hourOpen, setHourOpen] = useState(false); const [editingHour, setEditingHour] = useState<OpeningHour | null>(null)
  const [closureOpen, setClosureOpen] = useState(false); const [editingClosure, setEditingClosure] = useState<LocationClosure | null>(null)
  const [deleteHour, setDeleteHour] = useState<OpeningHour | null>(null); const [deleteClosure, setDeleteClosure] = useState<LocationClosure | null>(null)
  const locationsQuery = useQuery({ queryKey: ['locations', tenantId, false], queryFn: () => api.locations.list(tenantId) })
  const activeLocationId = locationId || locationsQuery.data?.[0]?.id || ''
  const hoursQuery = useQuery({ queryKey: ['opening-hours', tenantId, activeLocationId], queryFn: () => api.openingHours.list(activeLocationId), enabled: Boolean(activeLocationId) })
  const closuresQuery = useQuery({ queryKey: ['closures', tenantId, activeLocationId], queryFn: () => api.closures.list(activeLocationId), enabled: Boolean(activeLocationId) })
  const hourForm = useForm<HourForm>({ resolver: zodResolver(hourSchema), defaultValues: { weekday: 0, weekdays: [0, 1, 2, 3, 4], starts_at: '09:00', ends_at: '18:00' } })
  const closureForm = useForm<ClosureForm>({ resolver: zodResolver(closureSchema), defaultValues: { starts_at: '', ends_at: '', reason: '' } })
  const selectedWeekdays = useWatch({ control: hourForm.control, name: 'weekdays' })

  const saveHourMutation = useMutation({
    mutationFn: async (values: HourForm) => {
      const common = { starts_at: `${values.starts_at}:00`, ends_at: `${values.ends_at}:00` }
      if (editingHour) {
        await api.openingHours.update(activeLocationId, editingHour.id, { ...common, weekday: values.weekday })
        return { saved: 1, failed: null }
      }
      const results = await Promise.allSettled(values.weekdays.map((weekday) => api.openingHours.create(activeLocationId, { ...common, weekday })))
      const saved = results.filter((result) => result.status === 'fulfilled').length
      const failed = results.find((result) => result.status === 'rejected')
      if (saved === 0 && failed) throw failed.reason
      return { saved, failed: failed?.reason ?? null }
    },
    onSuccess: async ({ saved, failed }) => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['opening-hours', tenantId, activeLocationId] }), invalidateSetupStatus(queryClient, tenantId)])
      setHourOpen(false)
      setEditingHour(null)
      toastSuccess(saved > 1 ? `${saved} horaires enregistrés.` : 'Horaire enregistré.')
      if (failed) toastError(failed, 'Certains horaires n’ont pas pu être enregistrés.')
    },
  })
  const removeHourMutation = useMutation({ mutationFn: (id: string) => api.openingHours.remove(activeLocationId, id), onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['opening-hours', tenantId, activeLocationId] }), invalidateSetupStatus(queryClient, tenantId)]); setDeleteHour(null); toastSuccess('Plage d’ouverture désactivée.') } })
  const saveClosureMutation = useMutation({ mutationFn: (values: ClosureForm) => { const input = { starts_at: toApiDateTime(values.starts_at), ends_at: toApiDateTime(values.ends_at), reason: values.reason || null }; return editingClosure ? api.closures.update(activeLocationId, editingClosure.id, input) : api.closures.create(activeLocationId, input) }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['closures', tenantId, activeLocationId] }); setClosureOpen(false); setEditingClosure(null); toastSuccess('Fermeture enregistrée.') } })
  const removeClosureMutation = useMutation({ mutationFn: (id: string) => api.closures.remove(activeLocationId, id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['closures', tenantId, activeLocationId] }); setDeleteClosure(null); toastSuccess('Fermeture supprimée.') } })
  const openHour = (item?: OpeningHour) => { setEditingHour(item ?? null); hourForm.reset(item ? { weekday: item.weekday, weekdays: [item.weekday], starts_at: item.starts_at.slice(0, 5), ends_at: item.ends_at.slice(0, 5) } : { weekday: 0, weekdays: [0, 1, 2, 3, 4], starts_at: '09:00', ends_at: '18:00' }); setHourOpen(true) }
  const openClosure = (item?: LocationClosure) => { setEditingClosure(item ?? null); closureForm.reset(item ? { starts_at: toLocalDateTime(item.starts_at), ends_at: toLocalDateTime(item.ends_at), reason: item.reason ?? '' } : { starts_at: '', ends_at: '', reason: '' }); setClosureOpen(true) }
  const submitHour = hourForm.handleSubmit(async (values) => { try { await saveHourMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, hourForm.setError); toastError(error) } })
  const submitClosure = closureForm.handleSubmit(async (values) => { try { await saveClosureMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, closureForm.setError); toastError(error) } })

  if (locationsQuery.isLoading) return <LoadingState />
  return <div className="page">
    <PageHeader eyebrow={selectedTenant!.name} title="Horaires & fermetures" description="Définissez les heures d’ouverture récurrentes et les fermetures exceptionnelles." />
    {!locationsQuery.data?.length ? <EmptyState title="Créez d’abord un établissement" description="Les horaires sont toujours rattachés à un établissement." /> : <>
      <div className="toolbar"><Select value={activeLocationId} onChange={(event) => setLocationId(event.target.value)}>{locationsQuery.data.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select><span className="toolbar-spacer" /><Button variant="secondary" onClick={() => tab === 'hours' ? openHour() : openClosure()}>+ {tab === 'hours' ? 'Ajouter une plage' : 'Ajouter une fermeture'}</Button></div>
      <div className="tabs"><button className={tab === 'hours' ? 'tab-active' : ''} onClick={() => setTab('hours')}>Horaires hebdomadaires</button><button className={tab === 'closures' ? 'tab-active' : ''} onClick={() => setTab('closures')}>Fermetures exceptionnelles</button></div>
      {tab === 'hours' && (hoursQuery.isLoading ? <LoadingState /> : <div className="weekly-grid">{weekdays.map((day, index) => { const items = hoursQuery.data?.filter((item) => item.weekday === index) ?? []; return <div className="day-card card" key={day}><div className="day-heading"><strong>{day}</strong>{items.length ? <span>{items.length} plage{items.length > 1 ? 's' : ''}</span> : <span>Fermé</span>}</div>{items.map((item) => <div className="hour-line" key={item.id}><span>{formatTime(item.starts_at)} – {formatTime(item.ends_at)}</span><div><button onClick={() => openHour(item)}>Modifier</button><button onClick={() => setDeleteHour(item)}>×</button></div></div>)}</div> })}</div>)}
      {tab === 'closures' && (closuresQuery.isLoading ? <LoadingState /> : !closuresQuery.data?.length ? <EmptyState title="Aucune fermeture planifiée" description="Ajoutez ici les jours fériés, congés ou fermetures exceptionnelles." action={<Button onClick={() => openClosure()}>Ajouter une fermeture</Button>} /> : <div className="card compact-list">{closuresQuery.data.map((item) => <div className="compact-row" key={item.id}><div><strong>{item.reason || 'Fermeture exceptionnelle'}</strong><span>{formatDateTime(item.starts_at)} → {formatDateTime(item.ends_at)}</span></div><small>{Math.max(1, Math.ceil((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 86_400_000))} jour(s)</small><div className="row-actions"><Button size="sm" variant="ghost" onClick={() => openClosure(item)}>Modifier</Button><button className="icon-button" onClick={() => setDeleteClosure(item)}>×</button></div></div>)}</div>)}
    </>}
    <Modal open={hourOpen} onClose={() => setHourOpen(false)} title={editingHour ? 'Modifier la plage' : 'Nouvelle plage d’ouverture'}><form onSubmit={submitHour} noValidate><div className="form-grid">{editingHour ? <Field label="Jour" className="form-span-2"><Select {...hourForm.register('weekday', { valueAsNumber: true })}>{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</Select></Field> : <FieldGroup label="Jours" error={hourForm.formState.errors.weekdays?.message} className="form-span-2"><WeekdayCheckboxes value={selectedWeekdays} onChange={(value) => hourForm.setValue('weekdays', value, { shouldDirty: true, shouldValidate: true })} /></FieldGroup>}<Field label="Ouverture"><Input type="time" {...hourForm.register('starts_at')} /></Field><Field label="Fermeture"><Input type="time" {...hourForm.register('ends_at')} /></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setHourOpen(false)}>Annuler</Button><Button type="submit" loading={saveHourMutation.isPending}>Enregistrer</Button></div></form></Modal>
    <Modal open={closureOpen} onClose={() => setClosureOpen(false)} title={editingClosure ? 'Modifier la fermeture' : 'Nouvelle fermeture'}><form onSubmit={submitClosure}><div className="form-grid"><Field label="Début" error={closureForm.formState.errors.starts_at?.message}><Input type="datetime-local" {...closureForm.register('starts_at')} /></Field><Field label="Fin" error={closureForm.formState.errors.ends_at?.message}><Input type="datetime-local" {...closureForm.register('ends_at')} /></Field><Field label="Motif" className="form-span-2"><Input placeholder="Jour férié, travaux…" {...closureForm.register('reason')} /></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setClosureOpen(false)}>Annuler</Button><Button type="submit" loading={saveClosureMutation.isPending}>Enregistrer</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(deleteHour)} onClose={() => setDeleteHour(null)} title="Désactiver cette plage ?" message="Elle ne sera plus prise en compte dans le calcul des disponibilités." danger confirmLabel="Désactiver" loading={removeHourMutation.isPending} onConfirm={() => deleteHour && removeHourMutation.mutate(deleteHour.id, { onError: toastError })} />
    <ConfirmDialog open={Boolean(deleteClosure)} onClose={() => setDeleteClosure(null)} title="Supprimer cette fermeture ?" message="La suppression est définitive et les créneaux concernés pourront redevenir disponibles." danger confirmLabel="Supprimer" loading={removeClosureMutation.isPending} onConfirm={() => deleteClosure && removeClosureMutation.mutate(deleteClosure.id, { onError: toastError })} />
  </div>
}
