import { describe, expect, it } from 'vitest'
import type { Tenant } from '../types'
import { chooseTenantId } from './tenant-selection'

const tenant = (id: string): Tenant => ({ id, name: id, slug: id, is_active: true, created_at: '', updated_at: '' })

describe('chooseTenantId', () => {
  it('conserve uniquement une sélection issue de la liste API', () => {
    expect(chooseTenantId([tenant('a'), tenant('b')], 'b')).toBe('b')
    expect(chooseTenantId([tenant('a'), tenant('b')], 'foreign')).toBeNull()
  })

  it('sélectionne automatiquement l’unique entreprise accessible', () => {
    expect(chooseTenantId([tenant('a')], null)).toBe('a')
  })

  it('exige un choix lorsque plusieurs entreprises sont disponibles', () => {
    expect(chooseTenantId([tenant('a'), tenant('b')], null)).toBeNull()
    expect(chooseTenantId([], null)).toBeNull()
  })
})
