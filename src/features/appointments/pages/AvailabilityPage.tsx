import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Select, Textarea } from '../../../components/ui'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { normalizeApiError } from '../../../lib/api-client'
import { applyServerFieldErrors } from '../../../lib/errors'
import { formatTime } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import type { AvailabilitySlot } from '../types'

type SearchParams = { location_id: string; service_id: string; date: string; employee_id?: string; slot_interval_minutes: number }
const bookingSchema = z.object({
  customer_mode: z.enum(['existing', 'new']), customer_id: z.string().optional(), first_name: z.string().optional(), last_name: z.string().optional(),
  email: z.union([z.string().email('Adresse e-mail invalide.'), z.literal('')]).optional(), phone: z.string().optional(), notes: z.string().optional(),
}).superRefine((value, context) => {
  if (value.customer_mode === 'existing' && !value.customer_id) context.addIssue({ code: 'custom', path: ['customer_id'], message: 'Sélectionnez un client.' })
  if (value.customer_mode === 'new' && !value.first_name?.trim()) context.addIssue({ code: 'custom', path: ['first_name'], message: 'Le prénom est requis.' })
  if (value.customer_mode === 'new' && !value.last_name?.trim()) context.addIssue({ code: 'custom', path: ['last_name'], message: 'Le nom est requis.' })
})
type BookingForm = z.infer<typeof bookingSchema>

export function AvailabilityPage() {
  const { selectedTenant } = useTenant(); const tenantId = selectedTenant!.id
  const today = new Date().toISOString().slice(0, 10)
  const [locationId, setLocationId] = useState(''); const [serviceId, setServiceId] = useState(''); const [employeeId, setEmployeeId] = useState(''); const [date, setDate] = useState(today)
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null); const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null)
  const locationsQuery = useQuery({ queryKey: ['locations', tenantId, false], queryFn: () => api.locations.list(tenantId) })
  const servicesQuery = useQuery({ queryKey: ['services', tenantId, 'booking'], queryFn: () => api.services.list({ is_active: true, page: 1, page_size: 100 }) })
  const employeesQuery = useQuery({ queryKey: ['employees', tenantId, locationId, 'booking'], queryFn: () => api.employees.list({ location_id: locationId || undefined, is_active: true, is_bookable: true, page: 1, page_size: 100 }), enabled: Boolean(locationId) })
  const customersQuery = useQuery({ queryKey: ['customers', tenantId, 'booking'], queryFn: () => api.customers.list({ page: 1, page_size: 100 }) })
  const availabilityQuery = useQuery({ queryKey: ['availability', tenantId, searchParams], queryFn: () => api.availability(searchParams!), enabled: Boolean(searchParams) })
  const form = useForm<BookingForm>({ resolver: zodResolver(bookingSchema), defaultValues: { customer_mode: 'existing', customer_id: '', first_name: '', last_name: '', email: '', phone: '', notes: '' } })
  const customerMode = useWatch({ control: form.control, name: 'customer_mode' })
  const availableServices = useMemo(() => servicesQuery.data?.items.filter((service) => !service.location_id || service.location_id === locationId) ?? [], [servicesQuery.data, locationId])
  const employeeName = (id: string) => { const employee = employeesQuery.data?.items.find((item) => item.id === id); return employee ? `${employee.first_name} ${employee.last_name}` : 'Collaborateur' }
  const selectedService = servicesQuery.data?.items.find((item) => item.id === serviceId)

  const createMutation = useMutation({
    mutationFn: (values: BookingForm) => api.appointments.create({
      location_id: searchParams!.location_id, employee_id: selectedSlot!.employee_id, service_ids: [searchParams!.service_id], starts_at: selectedSlot!.starts_at,
      customer_id: values.customer_mode === 'existing' ? values.customer_id : null,
      customer: values.customer_mode === 'new' ? { first_name: values.first_name!.trim(), last_name: values.last_name!.trim(), email: values.email || null, phone: values.phone || null, marketing_consent: false } : null,
      notes: values.notes || null,
    }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['appointments', tenantId] }); await availabilityQuery.refetch(); setSelectedSlot(null); form.reset(); toastSuccess('Rendez-vous créé avec succès.') },
  })
  const submitBooking = form.handleSubmit(async (values) => {
    try { await createMutation.mutateAsync(values) }
    catch (error) {
      applyServerFieldErrors(error, form.setError)
      const apiError = normalizeApiError(error)
      if (apiError.status === 409) { setSelectedSlot(null); await availabilityQuery.refetch() }
      toastError(error, 'Impossible de créer le rendez-vous.')
    }
  })
  const search = () => {
    if (!locationId || !serviceId || !date) { toastError(new Error('Sélectionnez un établissement, une prestation et une date.')); return }
    setSearchParams({ location_id: locationId, service_id: serviceId, date, employee_id: employeeId || undefined, slot_interval_minutes: 15 })
  }

  return <div className="page">
    <PageHeader eyebrow="Réservation" title="Trouver un créneau" description="Les disponibilités tiennent compte des horaires, absences, fermetures et rendez-vous existants." />
    <div className="availability-search card"><div className="form-grid">
      <Field label="Établissement"><Select value={locationId} onChange={(event) => { setLocationId(event.target.value); setServiceId(''); setEmployeeId(''); setSearchParams(null) }}><option value="">Sélectionner…</option>{locationsQuery.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></Field>
      <Field label="Prestation"><Select value={serviceId} disabled={!locationId} onChange={(event) => { setServiceId(event.target.value); setSearchParams(null) }}><option value="">Sélectionner…</option>{availableServices.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</Select></Field>
      <Field label="Date"><Input type="date" min={today} value={date} onChange={(event) => { setDate(event.target.value); setSearchParams(null) }} /></Field>
      <Field label="Collaborateur" hint="Optionnel"><Select value={employeeId} disabled={!locationId} onChange={(event) => { setEmployeeId(event.target.value); setSearchParams(null) }}><option value="">Toute l’équipe</option>{employeesQuery.data?.items.map((employee) => <option key={employee.id} value={employee.id}>{employee.first_name} {employee.last_name}</option>)}</Select></Field>
    </div><div className="search-action"><Button onClick={search} loading={availabilityQuery.isFetching}>Rechercher les disponibilités</Button></div></div>
    {availabilityQuery.isFetching ? <LoadingState label="Calcul des meilleurs créneaux…" /> : searchParams && !availabilityQuery.data?.length ? <EmptyState title="Aucun créneau disponible" description="Essayez une autre date, un autre collaborateur ou vérifiez les horaires configurés." /> : availabilityQuery.data?.length ? <div className="slots-section"><div className="slots-heading"><div><h2>{availabilityQuery.data.length} créneau{availabilityQuery.data.length > 1 ? 'x' : ''} disponible{availabilityQuery.data.length > 1 ? 's' : ''}</h2><p>{selectedService?.name} · {date}</p></div></div><div className="slot-grid">{availabilityQuery.data.map((slot) => <button key={`${slot.employee_id}-${slot.starts_at}`} className="slot-card" onClick={() => { form.reset(); setSelectedSlot(slot) }}><span className="slot-time">{formatTime(slot.starts_at)}</span><span><strong>{employeeName(slot.employee_id)}</strong><small>Jusqu’à {formatTime(slot.ends_at)} · {slot.duration_minutes} min</small></span><i>→</i></button>)}</div></div> : <div className="booking-prompt"><h3>Choisissez vos critères</h3><p>Les créneaux disponibles s’afficheront ici.</p></div>}
    <Modal open={Boolean(selectedSlot)} onClose={() => setSelectedSlot(null)} title="Finaliser le rendez-vous" description={selectedSlot ? `${formatTime(selectedSlot.starts_at)} · ${employeeName(selectedSlot.employee_id)} · ${selectedService?.name}` : ''} size="lg"><form onSubmit={submitBooking}><div className="segmented"><button type="button" className={customerMode === 'existing' ? 'selected' : ''} onClick={() => form.setValue('customer_mode', 'existing')}>Client existant</button><button type="button" className={customerMode === 'new' ? 'selected' : ''} onClick={() => form.setValue('customer_mode', 'new')}>Nouveau client</button></div>
      {customerMode === 'existing' ? <Field label="Client" error={form.formState.errors.customer_id?.message}><Select {...form.register('customer_id')}><option value="">Sélectionner un client…</option>{customersQuery.data?.items.map((customer) => <option key={customer.id} value={customer.id}>{customer.first_name} {customer.last_name}{customer.email ? ` · ${customer.email}` : ''}</option>)}</Select></Field> : <div className="form-grid"><Field label="Prénom" error={form.formState.errors.first_name?.message}><Input {...form.register('first_name')} /></Field><Field label="Nom" error={form.formState.errors.last_name?.message}><Input {...form.register('last_name')} /></Field><Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field><Field label="Téléphone"><Input type="tel" {...form.register('phone')} /></Field></div>}
      <Field label="Notes" className="booking-notes"><Textarea {...form.register('notes')} /></Field><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setSelectedSlot(null)}>Annuler</Button><Button type="submit" loading={createMutation.isPending}>Confirmer le rendez-vous</Button></div></form></Modal>
  </div>
}
