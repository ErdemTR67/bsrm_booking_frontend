import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button, ConfirmDialog, EmptyState, Field, Input, LoadingState, PageHeader, Select, Textarea } from '../../../components/ui'
import { useTenant } from '../../tenants/context/tenant-context'
import { api } from '../../../lib/api'
import { ApiError } from '../../../lib/api-client'
import { applyServerFieldErrors } from '../../../lib/errors'
import { queryClient } from '../../../lib/query-client'
import { toastError, toastSuccess } from '../../../lib/toast'
import { isValidHttpOrigin, parseAllowedOrigins } from '../lib/booking-site'
import type { BookingSite, BookingSiteInput } from '../types'

const originsSchema = z.string().superRefine((value, context) => {
  const origins = parseAllowedOrigins(value)
  if (origins.length === 0) {
    context.addIssue({ code: 'custom', message: 'Ajoutez au moins le domaine du site vitrine.' })
    return
  }
  if (origins.length > 20) context.addIssue({ code: 'custom', message: 'Maximum 20 domaines autorisés.' })
  if (origins.some((origin) => !isValidHttpOrigin(origin))) {
    context.addIssue({ code: 'custom', message: 'Utilisez une origine HTTP(S) sans chemin, par exemple https://salon.be.' })
  }
})

const schema = z.object({
  name: z.string().trim().min(1, 'Le nom est requis.').max(150),
  allowed_origins: originsSchema,
  default_location_id: z.string(),
  slot_interval_minutes: z.number().int().min(5).max(120),
  minimum_notice_minutes: z.number().int().min(0).max(43_200),
  maximum_advance_days: z.number().int().min(1).max(365),
  require_phone: z.boolean(),
  booking_enabled: z.boolean(),
})
type BookingSiteForm = z.infer<typeof schema>

const defaults: BookingSiteForm = {
  name: 'Site de réservation',
  allowed_origins: 'http://localhost:3000',
  default_location_id: '',
  slot_interval_minutes: 15,
  minimum_notice_minutes: 60,
  maximum_advance_days: 90,
  require_phone: false,
  booking_enabled: true,
}

function toForm(site: BookingSite): BookingSiteForm {
  return {
    name: site.name,
    allowed_origins: site.allowed_origins.join('\n'),
    default_location_id: site.default_location_id ?? '',
    slot_interval_minutes: site.slot_interval_minutes,
    minimum_notice_minutes: site.minimum_notice_minutes,
    maximum_advance_days: site.maximum_advance_days,
    require_phone: site.require_phone,
    booking_enabled: site.booking_enabled,
  }
}

function toInput(values: BookingSiteForm): BookingSiteInput {
  return {
    ...values,
    allowed_origins: parseAllowedOrigins(values.allowed_origins),
    default_location_id: values.default_location_id || null,
  }
}

function publicConfiguration(site: BookingSite): BookingSite {
  return {
    id: site.id,
    name: site.name,
    key_prefix: site.key_prefix,
    allowed_origins: site.allowed_origins,
    default_location_id: site.default_location_id,
    slot_interval_minutes: site.slot_interval_minutes,
    minimum_notice_minutes: site.minimum_notice_minutes,
    maximum_advance_days: site.maximum_advance_days,
    require_phone: site.require_phone,
    booking_enabled: site.booking_enabled,
    is_active: site.is_active,
    created_at: site.created_at,
    updated_at: site.updated_at,
  }
}

export function BookingSitePage() {
  const { selectedTenant } = useTenant()
  const tenantId = selectedTenant!.id
  const [issuedKey, setIssuedKey] = useState<string | null>(null)
  const [rotateOpen, setRotateOpen] = useState(false)
  const form = useForm<BookingSiteForm>({ resolver: zodResolver(schema), defaultValues: defaults })
  const siteQuery = useQuery({
    queryKey: ['booking-site', tenantId],
    queryFn: api.bookingSite.get,
    meta: { silentError: true },
  })
  const locationsQuery = useQuery({
    queryKey: ['locations', tenantId, false],
    queryFn: () => api.locations.list(tenantId),
  })
  const missing = siteQuery.error instanceof ApiError && siteQuery.error.status === 404
  const forbidden = siteQuery.error instanceof ApiError && siteQuery.error.status === 403

  useEffect(() => {
    if (siteQuery.data) form.reset(toForm(siteQuery.data))
  }, [form, siteQuery.data])

  const saveMutation = useMutation({
    mutationFn: (values: BookingSiteForm) => missing ? api.bookingSite.create(toInput(values)) : api.bookingSite.update(toInput(values)),
    onSuccess: (site) => {
      queryClient.setQueryData(['booking-site', tenantId], publicConfiguration(site))
      form.reset(toForm(site))
      if ('publishable_key' in site && typeof site.publishable_key === 'string') setIssuedKey(site.publishable_key)
      toastSuccess(missing ? 'Site de réservation configuré.' : 'Configuration enregistrée.')
    },
  })
  const rotateMutation = useMutation({
    mutationFn: api.bookingSite.rotateKey,
    onSuccess: (site) => {
      queryClient.setQueryData(['booking-site', tenantId], publicConfiguration(site))
      setIssuedKey(site.publishable_key)
      setRotateOpen(false)
      toastSuccess('Nouvelle clé créée. L’ancienne clé ne fonctionne plus.')
    },
  })

  const submit = form.handleSubmit(async (values) => {
    try { await saveMutation.mutateAsync(values) }
    catch (error) {
      applyServerFieldErrors(error, form.setError)
      toastError(error, 'Impossible d’enregistrer le site de réservation.')
    }
  })

  const copyKey = async () => {
    if (!issuedKey) return
    try {
      await navigator.clipboard.writeText(issuedKey)
      toastSuccess('Clé copiée.')
    } catch {
      toastError(new Error('Copie impossible.'), 'Sélectionnez et copiez la clé manuellement.')
    }
  }

  if (siteQuery.isLoading) return <LoadingState label="Chargement du site de réservation…" />
  if (forbidden) return (
    <div className="page">
      <PageHeader eyebrow={selectedTenant!.name} title="Site de réservation" />
      <EmptyState title="Accès réservé" description="Seuls le propriétaire et les administrateurs de l’entreprise peuvent configurer le site public." />
    </div>
  )
  if (siteQuery.isError && !missing) return (
    <div className="page">
      <PageHeader eyebrow={selectedTenant!.name} title="Site de réservation" />
      <EmptyState title="Configuration indisponible" description="Le backend n’a pas pu charger cette configuration." action={<Button onClick={() => void siteQuery.refetch()}>Réessayer</Button>} />
    </div>
  )

  const site = siteQuery.data
  return (
    <div className="page">
      <PageHeader
        eyebrow={selectedTenant!.name}
        title="Site de réservation"
        description="Reliez un site vitrine à cet espace sans exposer les accès privés du portail."
        action={site && <Button variant="secondary" onClick={() => setRotateOpen(true)}>Renouveler la clé</Button>}
      />

      {issuedKey && (
        <section className="booking-key-panel" aria-live="polite">
          <div><span>Clé publiable - affichée une seule fois</span><strong>Copiez-la maintenant dans le fichier .env.local du site vitrine.</strong></div>
          <code>{issuedKey}</code>
          <div className="row-actions"><Button onClick={() => void copyKey()}>Copier la clé</Button><Button variant="ghost" onClick={() => setIssuedKey(null)}>J’ai enregistré la clé</Button></div>
        </section>
      )}

      {!site && <div className="booking-site-intro"><strong>Aucun site n’est encore relié.</strong><span>Renseignez au minimum le domaine depuis lequel les clients réserveront.</span></div>}
      {site && !site.is_active && <div className="form-alert">Cette intégration a été désactivée côté backend. Contactez l’administration de la plateforme pour la réactiver.</div>}

      <form className="booking-site-layout" onSubmit={submit} noValidate>
        <section className="card">
          <header className="card-header"><h2>Connexion du site</h2>{site && <span className={`badge ${site.booking_enabled && site.is_active ? 'badge-active' : 'badge-inactive'}`}>{site.booking_enabled && site.is_active ? 'Réservations ouvertes' : 'Réservations fermées'}</span>}</header>
          <div className="card-body form-grid">
            <Field label="Nom de l’intégration" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field>
            <Field label="Établissement par défaut" hint="Facultatif si le client choisit sur le site"><Select {...form.register('default_location_id')}><option value="">Aucun établissement par défaut</option>{locationsQuery.data?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</Select></Field>
            <Field label="Origines autorisées" error={form.formState.errors.allowed_origins?.message} hint="Une origine par ligne, sans chemin. Exemple : https://monsalon.be" className="form-span-2"><Textarea rows={4} spellCheck={false} placeholder="https://monsalon.be" {...form.register('allowed_origins')} /></Field>
            {site && <div className="booking-key-prefix form-span-2"><span>Clé actuellement enregistrée</span><code>{site.key_prefix}••••••••</code></div>}
          </div>
        </section>

        <section className="card">
          <header className="card-header"><h2>Règles de réservation</h2></header>
          <div className="card-body form-grid">
            <Field label="Intervalle des créneaux (minutes)" error={form.formState.errors.slot_interval_minutes?.message}><Input type="number" min="5" max="120" {...form.register('slot_interval_minutes', { valueAsNumber: true })} /></Field>
            <Field label="Préavis minimum (minutes)" error={form.formState.errors.minimum_notice_minutes?.message}><Input type="number" min="0" max="43200" {...form.register('minimum_notice_minutes', { valueAsNumber: true })} /></Field>
            <Field label="Réservation jusqu’à (jours)" error={form.formState.errors.maximum_advance_days?.message}><Input type="number" min="1" max="365" {...form.register('maximum_advance_days', { valueAsNumber: true })} /></Field>
            <div className="booking-options">
              <label className="toggle-label"><input type="checkbox" {...form.register('require_phone')} />Téléphone obligatoire</label>
              <label className="toggle-label"><input type="checkbox" {...form.register('booking_enabled')} />Autoriser les nouvelles réservations</label>
            </div>
          </div>
        </section>

        <div className="booking-site-actions">
          <p>{missing ? 'La clé créée sera utilisable uniquement depuis les domaines autorisés.' : 'Les changements sont appliqués immédiatement au site vitrine.'}</p>
          <Button type="submit" loading={saveMutation.isPending} disabled={Boolean(site && !site.is_active)}>{missing ? 'Créer l’accès au site' : 'Enregistrer les changements'}</Button>
        </div>
      </form>

      <ConfirmDialog
        open={rotateOpen}
        onClose={() => setRotateOpen(false)}
        title="Renouveler la clé publique ?"
        message="L’ancienne clé cessera immédiatement de fonctionner. Vous devrez remplacer la variable NEXT_PUBLIC_BSRM_SITE_KEY du site vitrine."
        confirmLabel="Créer une nouvelle clé"
        loading={rotateMutation.isPending}
        onConfirm={() => rotateMutation.mutate(undefined, { onError: (error) => toastError(error, 'Impossible de renouveler la clé.') })}
      />
    </div>
  )
}
