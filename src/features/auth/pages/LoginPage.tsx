import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button, Field, Input } from '../../../components/ui'
import { AuthLayout } from '../../../layouts/AuthLayout'
import { api } from '../../../lib/api'
import { getPendingInvitationToken, savePendingInvitationToken } from '../../../lib/auth'
import { applyServerFieldErrors, getErrorMessage } from '../../../lib/errors'
import { queryClient } from '../../../lib/query-client'
import { emitToast, toastError } from '../../../lib/toast'
import { useAuth } from '../context/auth-context'

const schema = z.object({
  email: z.string().trim().email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Le mot de passe est requis.'),
})
type LoginForm = z.infer<typeof schema>

export function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as { from?: string; email?: string; message?: string; invitation?: boolean } | null
  const [formError, setFormError] = useState('')
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: routeState?.email ?? '', password: '' },
  })

  if (status === 'authenticated' && !getPendingInvitationToken()) return <Navigate to="/" replace />

  const submit = handleSubmit(async (values) => {
    setFormError('')
    try {
      await login(values.email, values.password)
      const invitationToken = getPendingInvitationToken()
      if (invitationToken) {
        try {
          await api.auth.acceptExistingInvitation(invitationToken)
          await queryClient.invalidateQueries({ queryKey: ['tenants'] })
          emitToast('Invitation acceptée. L’entreprise est maintenant accessible.', 'success')
        } catch (error) {
          toastError(error, 'Connexion réussie, mais l’invitation n’a pas pu être acceptée.')
        } finally {
          savePendingInvitationToken(null)
        }
      } else {
        emitToast('Bienvenue dans BSRM Booking.', 'success')
      }
      const destination = routeState?.from ?? '/'
      navigate(destination, { replace: true })
    } catch (error) {
      applyServerFieldErrors(error, setError)
      setFormError(getErrorMessage(error, 'Connexion impossible.'))
    }
  })

  return (
    <AuthLayout
      kicker="Votre activité, orchestrée"
      title="Une journée fluide commence par un agenda clair."
      description="Centralisez vos équipes, vos prestations et vos rendez-vous dans un espace conçu pour aller à l’essentiel."
      visualFooter={<div className="auth-preview" aria-hidden="true">
          <div className="preview-top"><span>Aujourd’hui</span><strong>14 août</strong></div>
          <div className="preview-slot"><time>09:30</time><div><strong>Coupe & brushing</strong><span>Marie Dupont · 45 min</span></div></div>
          <div className="preview-slot"><time>11:00</time><div><strong>Soin visage</strong><span>Sarah Martin · 60 min</span></div></div>
          <div className="preview-slot muted"><time>12:30</time><div><strong>Pause</strong><span>30 min</span></div></div>
        </div>}
    >
          <span className="eyebrow">Ravi de vous revoir</span>
          <h2>Connectez-vous</h2>
          <p className="auth-subtitle">Accédez à votre espace de réservation.</p>
          {routeState?.message && <div className="form-notice" role="status">{routeState.message}</div>}
          {routeState?.invitation && <div className="form-notice" role="status">Connectez-vous avec le compte associé à l’invitation. Elle sera acceptée automatiquement.</div>}
          <form onSubmit={submit} className="auth-form" noValidate>
            <Field label="Adresse e-mail" error={errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="vous@entreprise.be" {...register('email')} />
            </Field>
            <Field label="Mot de passe" error={errors.password?.message}>
              <Input type="password" autoComplete="current-password" placeholder="Votre mot de passe" {...register('password')} />
            </Field>
            {formError && <div className="form-alert" role="alert">{formError}</div>}
            <Button type="submit" loading={isSubmitting || status === 'authenticating'}>Se connecter</Button>
          </form>
          <p className="auth-switch">L’accès à BSRM Booking se fait uniquement sur invitation.</p>
    </AuthLayout>
  )
}
