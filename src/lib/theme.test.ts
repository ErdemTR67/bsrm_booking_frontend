import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('respecte le thème déjà choisi', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('utilise la préférence de l’appareil sans choix enregistré', () => {
    expect(resolveTheme(null, true)).toBe('dark')
    expect(resolveTheme(null, false)).toBe('light')
  })

  it('ignore une valeur enregistrée inconnue', () => {
    expect(resolveTheme('inconnu', true)).toBe('dark')
  })
})
