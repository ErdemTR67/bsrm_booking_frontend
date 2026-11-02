import { describe, expect, it } from 'vitest'
import { invitationSchema, utf8ByteLength } from './invitation'

const validForm = {
  first_name: 'Jean',
  last_name: 'Dupont',
  password: 'mot-de-passe-solide',
  password_confirmation: 'mot-de-passe-solide',
}

describe('invitationSchema', () => {
  it('accepte un formulaire conforme', () => {
    expect(invitationSchema.safeParse(validForm).success).toBe(true)
  })

  it('refuse deux mots de passe différents', () => {
    const result = invitationSchema.safeParse({ ...validForm, password_confirmation: 'un-autre-mot-de-passe' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === 'password_confirmation')).toBe(true)
  })

  it('gère correctement les mots de passe contenant des caractères accentués', () => {
    const exactly72Bytes = 'é'.repeat(36)
    const over72Bytes = 'é'.repeat(37)
    expect(utf8ByteLength(exactly72Bytes)).toBe(72)
    expect(invitationSchema.safeParse({ ...validForm, password: exactly72Bytes, password_confirmation: exactly72Bytes }).success).toBe(true)
    expect(invitationSchema.safeParse({ ...validForm, password: over72Bytes, password_confirmation: over72Bytes }).success).toBe(false)
  })
})
