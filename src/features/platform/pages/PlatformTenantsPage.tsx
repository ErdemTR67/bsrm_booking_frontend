import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, EmptyState, Field, Input, Modal, PageHeader } from '../../../components/ui'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { nextAvailableSlug } from '../../../lib/format'
import { toastError, toastSuccess } from '../../../lib/toast'
import { usePlatform } from '../context/platform-context'

const tenantSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(150),
})
type TenantForm = z.infer<typeof tenantSchema>

export function PlatformTenantsPage() {
  const [open, setOpen] = useState(false)
  const { tenants, refreshTenants } = usePlatform()
  const navigate = useNavigate()
  const form = useForm<TenantForm>({ resolver: zodResolver(tenantSchema), defaultValues: { name: '' } })
  const createMutation = useMutation({
    mutationFn: (values: TenantForm) => api.platform.tenants.create({
      name: values.name,
      slug: nextAvailableSlug(values.name, tenants.map((tenant) => tenant.slug), 'entreprise'),
    }),
    onSuccess: async (tenant) => {
      await refreshTenants()
      form.reset()
      setOpen(false)
      toastSuccess('Entreprise créée. Vous pouvez maintenant inviter son propriétaire.')
      navigate(`/platform/tenants/${tenant.id}`)
    },
  })
  const submit = form.handleSubmit(async (values) => {
    try { await createMutation.mutateAsync(values) }
    catch (error) { applyServerFieldErrors(error, form.setError); toastError(error, 'Impossible de créer cette entreprise.') }
  })

  return (
    <div className="page">
      <PageHeader eyebrow="Administration générale" title="Entreprises" description="Créez les entreprises clientes et préparez leurs premiers accès." action={<Button onClick={() => setOpen(true)}>+ Nouvelle entreprise</Button>} />
      {tenants.length === 0 ? (
        <EmptyState title="Aucune entreprise" description="Créez une entreprise, puis envoyez une invitation à son propriétaire." action={<Button onClick={() => setOpen(true)}>Créer une entreprise</Button>} />
      ) : (
        <div className="card">
          <div className="data-table-head"><span>Entreprise</span><span>Création</span><span>Statut</span><span>Actions</span></div>
          <div className="data-list">{tenants.map((tenant) => <div className="data-row" key={tenant.id}>
            <div className="data-main"><span className="tenant-logo">{tenant.name.slice(0, 1).toUpperCase()}</span><div><strong>{tenant.name}</strong><small>{tenant.is_active ? 'Accès disponibles' : 'Accès suspendus'}</small></div></div>
            <div className="data-cell">{new Intl.DateTimeFormat('fr-BE').format(new Date(tenant.created_at))}<small>Date de création</small></div>
            <div className="data-cell"><span className={`badge ${tenant.is_active ? 'badge-active' : 'badge-inactive'}`}>{tenant.is_active ? 'Active' : 'Désactivée'}</span></div>
            <div className="row-actions"><Button size="sm" variant="ghost" onClick={() => navigate(`/platform/tenants/${tenant.id}`)}>Administrer</Button></div>
          </div>)}</div>
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Créer une entreprise" description="Vous pourrez ensuite envoyer une invitation à son propriétaire.">
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <Field label="Nom de l’entreprise" error={form.formState.errors.name?.message} className="form-span-2">
              <Input autoFocus {...form.register('name')} />
            </Field>
          </div>
          <div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuler</Button><Button type="submit" loading={createMutation.isPending}>Créer</Button></div>
        </form>
      </Modal>
    </div>
  )
}
