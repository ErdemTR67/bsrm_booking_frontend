import { useDeferredValue, useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Avatar, Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Pagination, Textarea } from '../../../components/ui'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { initials } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import type { Customer } from '../types'

const schema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis.'), last_name: z.string().trim().min(1, 'Le nom est requis.'),
  email: z.union([z.string().trim().email('Adresse e-mail invalide.'), z.literal('')]), phone: z.string().optional(), notes: z.string().optional(), marketing_consent: z.boolean(),
})
type CustomerForm = z.infer<typeof schema>
const defaults: CustomerForm = { first_name: '', last_name: '', email: '', phone: '', notes: '', marketing_consent: false }

export function CustomersPage() {
  const { selectedTenant } = useTenant()
  const tenantId = selectedTenant!.id
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<Customer | null>(null)
  const customersQuery = useQuery({ queryKey: ['customers', tenantId, deferredSearch, page], queryFn: () => api.customers.list({ query: deferredSearch || undefined, page, page_size: 20 }) })
  const form = useForm<CustomerForm>({ resolver: zodResolver(schema), defaultValues: defaults })

  useEffect(() => { form.reset(editing ? { first_name: editing.first_name, last_name: editing.last_name, email: editing.email ?? '', phone: editing.phone ?? '', notes: editing.notes ?? '', marketing_consent: editing.marketing_consent } : defaults) }, [editing, form])
  const saveMutation = useMutation({
    mutationFn: (values: CustomerForm) => {
      const input = { ...values, email: values.email || null, phone: values.phone || null, notes: values.notes || null }
      return editing ? api.customers.update(editing.id, input) : api.customers.create(input)
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['customers', tenantId] }); toastSuccess(editing ? 'Client mis à jour.' : 'Client ajouté.'); closeForm() },
  })
  const removeMutation = useMutation({ mutationFn: api.customers.remove, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['customers', tenantId] }); setRemoving(null); toastSuccess('Client supprimé.') } })
  function closeForm() { setFormOpen(false); setEditing(null); form.reset(defaults) }
  const submit = form.handleSubmit(async (values) => { try { await saveMutation.mutateAsync(values) } catch (error) { applyServerFieldErrors(error, form.setError); toastError(error, 'Impossible d’enregistrer ce client.') } })

  return <div className="page">
    <PageHeader eyebrow={selectedTenant!.name} title="Clients" description="Retrouvez les coordonnées, préférences et historique de votre clientèle." action={<Button onClick={() => { setEditing(null); setFormOpen(true) }}>+ Nouveau client</Button>} />
    <div className="toolbar"><Input aria-label="Rechercher un client" placeholder="Rechercher par nom, e-mail ou téléphone…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} /><span className="toolbar-spacer" />{customersQuery.data && <span className="result-count">{customersQuery.data.total} client{customersQuery.data.total > 1 ? 's' : ''}</span>}</div>
    {customersQuery.isLoading ? <LoadingState /> : !customersQuery.data?.items.length ? <EmptyState title={search ? 'Aucun résultat' : 'Aucun client'} description={search ? 'Essayez une recherche plus courte.' : 'Ajoutez votre premier client pour commencer.'} action={!search && <Button onClick={() => setFormOpen(true)}>Ajouter un client</Button>} /> : <div className="card"><div className="data-table-head"><span>Client</span><span>Téléphone</span><span>Consentement</span><span>Actions</span></div><div className="data-list">{customersQuery.data.items.map((customer) => <div className="data-row" key={customer.id}>
      <div className="data-main"><Avatar initials={initials(customer.first_name, customer.last_name)} /><div><strong>{customer.first_name} {customer.last_name}</strong><small>{customer.email || 'Aucune adresse e-mail'}</small></div></div>
      <div className="data-cell">{customer.phone || 'Non renseigné'}<small>Téléphone</small></div>
      <div className="data-cell"><span className={`badge ${customer.marketing_consent ? 'badge-active' : 'badge-inactive'}`}>{customer.marketing_consent ? 'Marketing accepté' : 'Sans consentement'}</span></div>
      <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => { setEditing(customer); setFormOpen(true) }}>Modifier</Button><button className="icon-button" title="Supprimer" onClick={() => setRemoving(customer)}>×</button></div>
    </div>)}</div><Pagination page={customersQuery.data.page} pageSize={customersQuery.data.page_size} total={customersQuery.data.total} onPageChange={setPage} /></div>}
    <Modal open={formOpen} onClose={closeForm} title={editing ? 'Modifier le client' : 'Nouveau client'} size="lg"><form onSubmit={submit} noValidate><div className="form-grid">
      <Field label="Prénom" error={form.formState.errors.first_name?.message}><Input autoFocus {...form.register('first_name')} /></Field><Field label="Nom" error={form.formState.errors.last_name?.message}><Input {...form.register('last_name')} /></Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field><Field label="Téléphone"><Input type="tel" {...form.register('phone')} /></Field>
      <Field label="Notes" className="form-span-2"><Textarea placeholder="Préférences, informations utiles…" {...form.register('notes')} /></Field>
      <label className="check-card form-span-2"><input type="checkbox" {...form.register('marketing_consent')} /><span><strong>Consentement marketing</strong><small>Le client accepte de recevoir des communications.</small></span></label>
    </div><div className="modal-actions"><Button type="button" variant="ghost" onClick={closeForm}>Annuler</Button><Button type="submit" loading={saveMutation.isPending}>{editing ? 'Enregistrer' : 'Ajouter'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Supprimer ce client ?" message="Cette suppression est définitive. Les rendez-vous conserveront néanmoins leurs informations historiques." confirmLabel="Supprimer" danger loading={removeMutation.isPending} onConfirm={() => removing && removeMutation.mutate(removing.id, { onError: (error) => toastError(error) })} />
  </div>
}
