import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SetupStatus } from '../features/setup/types'

const { get, post, patch } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))

vi.mock('./api-client', () => ({ default: { get, post, patch } }))

import { api } from './api'

describe('api.setup.status', () => {
  beforeEach(() => get.mockReset())

  it('appelle la route documentée sans envoyer le tenant dans les paramètres', async () => {
    const response: SetupStatus = {
      is_complete: false,
      progress_percent: 50,
      next_step: 'employee',
      steps: [{ key: 'employee', complete: false }],
    }
    get.mockResolvedValue({ data: response })

    await expect(api.setup.status('tenant-a')).resolves.toEqual(response)
    expect(get).toHaveBeenCalledWith('/api/v1/setup/status', {
      headers: { 'X-Tenant-ID': 'tenant-a' },
    })
  })
})

describe('api.services.listAllActive', () => {
  beforeEach(() => get.mockReset())

  it('charge toutes les pages de prestations actives', async () => {
    get
      .mockResolvedValueOnce({ data: { items: [{ id: 'service-a' }], page: 1, page_size: 100, total: 2 } })
      .mockResolvedValueOnce({ data: { items: [{ id: 'service-b' }], page: 2, page_size: 100, total: 2 } })

    await expect(api.services.listAllActive()).resolves.toEqual([{ id: 'service-a' }, { id: 'service-b' }])
    expect(get).toHaveBeenNthCalledWith(1, '/api/v1/services', { params: { is_active: true, page: 1, page_size: 100 } })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v1/services', { params: { is_active: true, page: 2, page_size: 100 } })
  })
})

describe('api.bookingSite', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    patch.mockReset()
  })

  it('utilise les routes privées de configuration du site', async () => {
    const input = {
      name: 'Réservation en ligne', allowed_origins: ['https://example.com'], default_location_id: null,
      slot_interval_minutes: 15, minimum_notice_minutes: 60, maximum_advance_days: 90,
      require_phone: false, booking_enabled: true,
    }
    const site = { id: 'site-a', ...input, key_prefix: 'bsrm_pk_test_', is_active: true, created_at: '', updated_at: '' }
    const issued = { ...site, publishable_key: 'bsrm_pk_test_secret' }
    get.mockResolvedValue({ data: site })
    post.mockResolvedValue({ data: issued })
    patch.mockResolvedValue({ data: site })

    await expect(api.bookingSite.get()).resolves.toEqual(site)
    await expect(api.bookingSite.create(input)).resolves.toEqual(issued)
    await expect(api.bookingSite.update({ booking_enabled: false })).resolves.toEqual(site)
    await expect(api.bookingSite.rotateKey()).resolves.toEqual(issued)

    expect(get).toHaveBeenCalledWith('/api/v1/booking-site')
    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/booking-site', input)
    expect(patch).toHaveBeenCalledWith('/api/v1/booking-site', { booking_enabled: false })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/booking-site/rotate-key')
  })
})
