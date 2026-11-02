import { z } from 'zod'

export const utf8ByteLength = (value: string) => new TextEncoder().encode(value).length

export const invitationSchema = z.object({
  first_name: z.string().trim().min(1, 'Le prénom est requis.').max(100, 'Le prénom est trop long.'),
  last_name: z.string().trim().min(1, 'Le nom est requis.').max(100, 'Le nom est trop long.'),
  password: z.string()
    .min(12, 'Utilisez au moins 12 caractères.')
    .refine((value) => utf8ByteLength(value) <= 72, 'Ce mot de passe est trop long. Choisissez-en un plus court.'),
  password_confirmation: z.string().min(1, 'Confirmez le mot de passe.'),
}).superRefine((value, context) => {
  if (value.password !== value.password_confirmation) {
    context.addIssue({ code: 'custom', path: ['password_confirmation'], message: 'Les mots de passe ne correspondent pas.' })
  }
})

export type InvitationForm = z.infer<typeof invitationSchema>
