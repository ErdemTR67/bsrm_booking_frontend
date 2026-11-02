import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field, Input } from '../../../components/ui'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { api } from '../../../lib/api'
import { normalizeApiError } from '../../../lib/api-client'
import { clearConsumedInvitationToken, consumeInvitationTokenFromUrl, savePendingInvitationToken } from '../../../lib/auth'
import { applyServerFieldErrors, getErrorMessage } from '../../../lib/errors'
import { toastError, toastSuccess } from '../../../lib/toast'
import { useAuth } from '../context/auth-context'
import { invitationSchema } from '../lib/invitation'
import type { InvitationForm } from '../lib/invitation'

export function AcceptInvitationPage() {
  const [token] = useState(consumeInvitationTokenFromUrl)
  const [formError, setFormError] = useState('')
  const [accountExists, setAccountExists] = useState(false)
  const [invalid, setInvalid] = useState(!token)
  const [joining, setJoining] = useState(false)
  const { login, logout, status } = useAuth()
  const navigate = useNavigate()
  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationSchema),
    defaultValues: { first_name: '', last_name: '', password: '', password_confirmation: '' },
  })

  const continueWithExistingAccount = async () => {
    if (!token) return
    setJoining(true)
    savePendingInvitationToken(token)
    clearConsumedInvitationToken()
    if (status === 'authenticated') {
      try { await logout() } catch { /* La session locale est tout de même effacée par le provider. */ }
    }
    navigate('/login', { replace: true, state: { invitation: true } })
  }

  const submit = form.handleSubmit(async (values) => {
    if (!token) return
    setFormError('')
    try {
      const user = await api.auth.acceptInvitation({
        token,
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        password: values.password,
      })
      clearConsumedInvitationToken()
      try {
        if (status === 'authenticated') {
          try { await logout() } catch { /* La connexion au nouveau compte peut continuer. */ }
        }
        await login(user.email, values.password)
        toastSuccess('Votre compte est prêt. Bienvenue dans BSRM Booking.')
        navigate('/', { replace: true })
      } catch (loginError) {
        toastError(loginError, 'Votre compte est créé, mais la connexion automatique a échoué.')
        navigate('/login', { replace: true, state: { email: user.email, message: 'Votre compte est créé. Connectez-vous pour continuer.' } })
      }
    } catch (error) {
      const apiError = normalizeApiError(error)
      if (apiError.code === 'invitation_account_exists') {
        savePendingInvitationToken(token)
        clearConsumedInvitationToken()
        setAccountExists(true)
        return
      }
      if (apiError.code === 'invalid_invitation') { clearConsumedInvitationToken(); setInvalid(true) }
      applyServerFieldErrors(error, form.setError)
      setFormError(getErrorMessage(error, 'Impossible d’accepter cette invitation.'))
      toastError(error, 'Impossible d’accepter cette invitation.')
    }
  }, (errors) => {
    const message = errors.password?.message || errors.password_confirmation?.message || errors.first_name?.message || errors.last_name?.message || 'Vérifiez les informations du formulaire.'
    toastError(new Error(message))
  })

  return (
    <AuthLayout
      kicker="Invitation privée"
      title="Rejoignez votre entreprise en toute sécurité."
      description="Votre accès a été préparé par un administrateur. Finalisez votre profil pour rejoindre l’espace qui vous a été attribué."
      visualFooter={<div className="invitation-note"><strong>Accès préparé</strong><span>L’entreprise et votre niveau d’accès sont déjà définis dans l’invitation.</span></div>}
      wide
    >
          {invalid ? (
            <div className="invitation-state" role="alert">
              <span className="eyebrow">Invitation indisponible</span>
              <h2>Ce lien n’est plus valide</h2>
              <p className="auth-subtitle">Il est incorrect, expiré, révoqué ou a déjà été utilisé. Demandez une nouvelle invitation à votre administrateur.</p>
              <Link className="button button-secondary button-md" to="/login">Retour à la connexion</Link>
            </div>
          ) : accountExists ? (
            <div className="invitation-state">
              <span className="eyebrow">Compte reconnu</span>
              <h2>Connectez-vous pour continuer</h2>
              <p className="auth-subtitle">Un compte existe déjà pour cette adresse. Après connexion, l’entreprise sera automatiquement ajoutée à vos accès.</p>
              <Button loading={joining} onClick={() => void continueWithExistingAccount()}>{status === 'authenticated' ? 'Rejoindre l’entreprise' : 'Se connecter'}</Button>
            </div>
          ) : (
            <>
              <span className="eyebrow">Finaliser votre accès</span>
              <h2>Créez votre compte</h2>
              <p className="auth-subtitle">Votre adresse e-mail et votre entreprise sont déjà associées à cette invitation.</p>
              <form onSubmit={submit} className="auth-form" noValidate>
                <div className="form-grid">
                  <Field label="Prénom" error={form.formState.errors.first_name?.message}><Input autoComplete="given-name" {...form.register('first_name')} /></Field>
                  <Field label="Nom" error={form.formState.errors.last_name?.message}><Input autoComplete="family-name" {...form.register('last_name')} /></Field>
                </div>
                <Field label="Mot de passe" error={form.formState.errors.password?.message} hint="12 caractères minimum">
                  <Input type="password" autoComplete="new-password" {...form.register('password')} />
                </Field>
                <Field label="Confirmation" error={form.formState.errors.password_confirmation?.message}>
                  <Input type="password" autoComplete="new-password" {...form.register('password_confirmation')} />
                </Field>
                {formError && <div className="form-alert" role="alert">{formError}</div>}
                <Button type="submit" loading={form.formState.isSubmitting}>Créer mon compte</Button>
              </form>
              <p className="auth-switch">Vous avez déjà un compte ? <button type="button" className="inline-link" onClick={() => void continueWithExistingAccount()}>Se connecter</button></p>
            </>
          )}
    </AuthLayout>
  )
}
