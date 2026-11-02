import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import { Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, Modal, PageHeader, Select } from '../../../components/ui'
import type { MembershipRole, TenantInvitation } from '../../tenants/types'
import { api } from '../../../lib/api'
import { applyServerFieldErrors } from '../../../lib/errors'
import { formatDateTime } from '../../../lib/format'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import { usePlatform } from '../context/platform-context'

const updateSchema = z.object({ name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(150) })
const invitationFormSchema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide.'),
  role: z.enum(['owner', 'admin', 'manager', 'staff']),
})
type UpdateForm = z.infer<typeof updateSchema>
type InvitationForm = z.infer<typeof invitationFormSchema>

const roleLabels: Record<MembershipRole, string> = { owner: 'Propriétaire', admin: 'Administrateur', manager: 'Manager', staff: 'Collaborateur' }
const statusLabels: Record<TenantInvitation['status'], string> = { pending: 'En attente', accepted: 'Acceptée', revoked: 'Révoquée', expired: 'Expirée' }

export function PlatformTenantDetailPage() {
  const { tenantId = '' } = useParams()
  const { refreshTenants } = usePlatform()
  const [editOpen, setEditOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const tenantQuery = useQuery({ queryKey: ['platform', 'tenant', tenantId], queryFn: () => api.platform.tenants.get(tenantId), enabled: Boolean(tenantId) })
  const invitationsQuery = useQuery({ queryKey: ['platform', 'tenant', tenantId, 'invitations'], queryFn: () => api.platform.tenants.invitations(tenantId), enabled: Boolean(tenantId) })
  const updateForm = useForm<UpdateForm>({ resolver: zodResolver(updateSchema), defaultValues: { name: '' } })
  const inviteForm = useForm<InvitationForm>({ resolver: zodResolver(invitationFormSchema), defaultValues: { email: '', role: 'owner' } })

  useEffect(() => { if (tenantQuery.data) updateForm.reset({ name: tenantQuery.data.name }) }, [tenantQuery.data, updateForm])

  const refreshTenant = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', tenantId] }),
      refreshTenants(),
    ])
  }
  const updateMutation = useMutation({
    mutationFn: (values: UpdateForm) => api.platform.tenants.update(tenantId, values),
    onSuccess: async () => { await refreshTenant(); setEditOpen(false); toastSuccess('Entreprise mise à jour.') },
  })
  const deactivateMutation = useMutation({
    mutationFn: () => api.platform.tenants.remove(tenantId),
    onSuccess: async () => { await refreshTenant(); setDeactivateOpen(false); toastSuccess('Entreprise désactivée.') },
  })
  const reactivateMutation = useMutation({
    mutationFn: () => api.platform.tenants.update(tenantId, { is_active: true }),
    onSuccess: async () => { await refreshTenant(); toastSuccess('Entreprise réactivée.') },
  })
  const invitationMutation = useMutation({
    mutationFn: (values: InvitationForm) => api.platform.tenants.invite(tenantId, values),
    onSuccess: async (invitation) => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', tenantId, 'invitations'] })
      inviteForm.reset({ email: '', role: 'owner' })
      setInviteOpen(false)
      setCreatedLink(invitation.acceptance_url)
      toastSuccess(invitation.acceptance_url ? 'Invitation créée. Le lien privé est prêt à être copié.' : 'Invitation envoyée par e-mail.')
    },
  })
  const revokeMutation = useMutation({
    mutationFn: api.platform.revokeInvitation,
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant', tenantId, 'invitations'] }); toastSuccess('Invitation révoquée.') },
  })

  const submitUpdate = updateForm.handleSubmit(async (values) => {
    try { await updateMutation.mutateAsync(values) }
    catch (error) { applyServerFieldErrors(error, updateForm.setError); toastError(error, 'Impossible de modifier cette entreprise.') }
  })
  const submitInvitation = inviteForm.handleSubmit(async (values) => {
    try { await invitationMutation.mutateAsync(values) }
    catch (error) { applyServerFieldErrors(error, inviteForm.setError); toastError(error, 'Impossible de créer cette invitation.') }
  })
  const copyAcceptanceLink = async () => {
    if (!createdLink) return
    try { await navigator.clipboard.writeText(createdLink); toastSuccess('Lien d’invitation copié.') }
    catch { toastError(new Error('Le presse-papiers n’est pas disponible.')) }
  }

  if (tenantQuery.isLoading) return <LoadingState label="Chargement de l’entreprise…" />
  if (!tenantQuery.data) return <EmptyState title="Entreprise introuvable" description="Cette entreprise n’existe pas ou n’est plus accessible." action={<Link className="button button-secondary button-md" to="/platform">Retour aux entreprises</Link>} />
  const tenant = tenantQuery.data

  return (
    <div className="page">
      <Link to="/platform" className="back-link">← Retour aux entreprises</Link>
      <PageHeader eyebrow="Administration générale" title={tenant.name} description="Gérez les informations de l’entreprise et les personnes qui peuvent la rejoindre." action={<div className="page-actions"><Button variant="secondary" onClick={() => setEditOpen(true)}>Modifier</Button>{tenant.is_active ? <Button variant="danger" onClick={() => setDeactivateOpen(true)}>Désactiver</Button> : <Button onClick={() => reactivateMutation.mutate(undefined, { onError: (error) => toastError(error) })} loading={reactivateMutation.isPending}>Réactiver</Button>}</div>} />
      <section className="platform-summary" aria-label="Informations de l’entreprise">
        <div><span>Statut</span><strong>{tenant.is_active ? 'Active' : 'Désactivée'}</strong></div>
        <div><span>Création</span><strong>{formatDateTime(tenant.created_at)}</strong></div>
        <div><span>Dernière modification</span><strong>{formatDateTime(tenant.updated_at)}</strong></div>
      </section>
      {createdLink && <div className="development-link" role="status"><div><strong>Lien privé disponible</strong><span>Copiez ce lien et transmettez-le uniquement à la personne invitée.</span></div><Button size="sm" onClick={() => void copyAcceptanceLink()}>Copier le lien</Button><button type="button" className="icon-button" onClick={() => setCreatedLink(null)} aria-label="Masquer le lien">×</button></div>}
      <section className="card">
        <div className="card-header"><h2>Invitations</h2><Button size="sm" disabled={!tenant.is_active} onClick={() => setInviteOpen(true)}>+ Nouvelle invitation</Button></div>
        {invitationsQuery.isLoading ? <LoadingState /> : !invitationsQuery.data?.length ? <div className="card-body"><EmptyState title="Aucune invitation" description="Invitez le propriétaire ou un membre de l’équipe pour lui attribuer un accès." /></div> : <div className="platform-invitations">
          <div className="platform-invitation-head"><span>Destinataire</span><span>Rôle</span><span>Expiration</span><span>Statut</span><span>Action</span></div>
          {invitationsQuery.data.map((invitation) => <div className="platform-invitation-row" key={invitation.id}>
            <div><strong>{invitation.email}</strong><small>Créée le {formatDateTime(invitation.created_at)}</small></div>
            <span>{roleLabels[invitation.role]}</span>
            <span>{formatDateTime(invitation.expires_at)}</span>
            <span className={`status-badge status-${invitation.status}`}>{statusLabels[invitation.status]}</span>
            <div className="row-actions">{invitation.status === 'pending' && <Button size="sm" variant="ghost" loading={revokeMutation.isPending} onClick={() => revokeMutation.mutate(invitation.id, { onError: (error) => toastError(error) })}>Révoquer</Button>}</div>
          </div>)}
        </div>}
      </section>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier l’entreprise">
        <form onSubmit={submitUpdate} noValidate><Field label="Nom" error={updateForm.formState.errors.name?.message}><Input autoFocus {...updateForm.register('name')} /></Field><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Annuler</Button><Button type="submit" loading={updateMutation.isPending}>Enregistrer</Button></div></form>
      </Modal>
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Inviter une personne" description="Choisissez son niveau d’accès. L’entreprise sera associée automatiquement.">
        <form onSubmit={submitInvitation} noValidate><div className="form-grid"><Field label="Adresse e-mail" error={inviteForm.formState.errors.email?.message} className="form-span-2"><Input type="email" autoFocus autoComplete="off" {...inviteForm.register('email')} /></Field><Field label="Rôle" error={inviteForm.formState.errors.role?.message} className="form-span-2"><Select {...inviteForm.register('role')}><option value="owner">Propriétaire</option><option value="admin">Administrateur</option><option value="manager">Manager</option><option value="staff">Collaborateur</option></Select></Field></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Annuler</Button><Button type="submit" loading={invitationMutation.isPending}>Créer l’invitation</Button></div></form>
      </Modal>
      <ConfirmDialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} title="Désactiver cette entreprise ?" message="Les personnes associées ne pourront plus accéder à cette entreprise tant qu’elle reste désactivée." confirmLabel="Désactiver" danger loading={deactivateMutation.isPending} onConfirm={() => deactivateMutation.mutate(undefined, { onError: (error) => toastError(error) })} />
    </div>
  )
}
