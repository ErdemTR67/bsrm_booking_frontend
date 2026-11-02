import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError, normalizeApiError } from './api-client'

const codeMessages: Record<string, string> = {
  invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
  invalid_access_token: 'Votre session a expiré. Veuillez vous reconnecter.',
  invalid_refresh_token: 'Votre session a expiré. Veuillez vous reconnecter.',
  inactive_user: 'Ce compte utilisateur est désactivé.',
  insufficient_permissions: 'Vous ne disposez pas des droits nécessaires pour cette action.',
  invalid_invitation: 'Cette invitation est incorrecte, expirée, révoquée ou déjà utilisée.',
  invitation_account_exists: 'Un compte existe déjà pour cette invitation. Connectez-vous pour la rejoindre.',
  invitation_already_resolved: 'Cette invitation a déjà été acceptée ou révoquée.',
  invitation_delivery_error: 'L’invitation a été créée, mais son envoi a échoué. Réessayez dans quelques instants.',
  tenant_not_found: 'Cet espace est introuvable ou vous n’y avez plus accès.',
  location_not_found: 'Cet établissement est introuvable.',
  employee_not_found: 'Ce collaborateur est introuvable.',
  service_not_found: 'Cette prestation est introuvable.',
  customer_not_found: 'Ce client est introuvable.',
  appointment_not_found: 'Ce rendez-vous est introuvable.',
  appointment_conflict: 'Ce créneau vient d’être réservé. Actualisez les disponibilités.',
  invalid_appointment_transition: 'Cette action n’est plus possible pour ce rendez-vous.',
  user_email_already_exists: 'Un compte existe déjà avec cette adresse e-mail.',
  tenant_already_exists: 'Cette entreprise existe déjà.',
  location_slug_already_exists: 'Un établissement portant ce nom existe déjà.',
  validation_error: 'Certaines informations sont invalides. Vérifiez le formulaire.',
  service_unavailable: 'Le service est temporairement indisponible. Réessayez dans quelques instants.',
  invitation_delivery_unavailable: 'Le service d’envoi des invitations est temporairement indisponible.',
  invitation_persistence_error: 'L’invitation n’a pas pu être enregistrée. Réessayez dans quelques instants.',
  tenant_persistence_error: 'L’entreprise n’a pas pu être enregistrée. Réessayez dans quelques instants.',
  location_persistence_error: 'L’établissement n’a pas pu être enregistré. Réessayez dans quelques instants.',
  internal_server_error: 'Un problème inattendu est survenu. Réessayez dans quelques instants.',
  request_failed: 'La requête n’a pas pu aboutir.',
  network_error: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
}

export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.') {
  const apiError = normalizeApiError(error)
  if (codeMessages[apiError.code]) return codeMessages[apiError.code]
  if (apiError.status === 403) return codeMessages.insufficient_permissions
  if (apiError.status === 404) return 'La ressource demandée est introuvable ou n’est plus accessible.'
  if (apiError.status === 409) return 'Cette opération entre en conflit avec l’état actuel de la ressource.'
  if (apiError.status === 503) return codeMessages.service_unavailable
  if (apiError.details?.length) return apiError.details.map((detail) => detail.message).join(' · ')
  return apiError.message || fallback
}

export function applyServerFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  const apiError = normalizeApiError(error)
  if (apiError.status !== 422 || !apiError.details?.length) return false

  let applied = false
  for (const detail of apiError.details) {
    const field = detail.location.at(-1)
    if (typeof field !== 'string') continue
    setError(field as Path<T>, { type: 'server', message: detail.message })
    applied = true
  }
  return applied
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError
