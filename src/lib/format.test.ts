import { describe, expect, it } from 'vitest'
import { nextAvailableSlug } from './format'

describe('nextAvailableSlug', () => {
  it('génère automatiquement une valeur simple à partir du nom', () => {
    expect(nextAvailableSlug('Atelier du Centre', [])).toBe('atelier-du-centre')
  })

  it('ajoute le prochain numéro disponible en cas de doublon', () => {
    expect(nextAvailableSlug('Atelier du Centre', ['atelier-du-centre', 'atelier-du-centre-2'])).toBe('atelier-du-centre-3')
  })

  it('utilise une valeur de remplacement pour un nom sans caractère compatible', () => {
    expect(nextAvailableSlug('你好', [], 'entreprise')).toBe('entreprise')
  })
})
