import { describe, expect, it } from 'vitest'
import { isValidHttpOrigin, parseAllowedOrigins } from './booking-site'

describe('booking site origins', () => {
  it('normalise une liste séparée par des lignes ou des virgules', () => {
    expect(parseAllowedOrigins('http://localhost:3000\nhttps://example.com, https://example.com')).toEqual([
      'http://localhost:3000',
      'https://example.com',
    ])
  })

  it('accepte uniquement des origines HTTP sans chemin ni wildcard', () => {
    expect(isValidHttpOrigin('https://booking.example.com')).toBe(true)
    expect(isValidHttpOrigin('http://localhost:3000')).toBe(true)
    expect(isValidHttpOrigin('https://example.com/reserver')).toBe(false)
    expect(isValidHttpOrigin('https://*.example.com')).toBe(false)
  })
})
