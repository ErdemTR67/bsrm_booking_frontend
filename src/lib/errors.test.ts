import { describe, expect, it } from 'vitest'
import { ApiError } from './api-client'
import { getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('traduit les erreurs métier d’invitation', () => {
    expect(getErrorMessage(new ApiError(401, 'invalid_invitation', 'Invalid invitation.'))).toContain('invitation')
    expect(getErrorMessage(new ApiError(409, 'invitation_account_exists', 'Account exists.'))).toContain('compte existe déjà')
  })

  it.each([
    [403, 'unknown', 'droits nécessaires'],
    [404, 'unknown', 'introuvable'],
    [409, 'unknown', 'conflit'],
    [503, 'unknown', 'temporairement indisponible'],
  ])('fournit un message central pour le statut %i', (status, code, expected) => {
    expect(getErrorMessage(new ApiError(status, code, 'Backend message.'))).toContain(expected)
  })
})
