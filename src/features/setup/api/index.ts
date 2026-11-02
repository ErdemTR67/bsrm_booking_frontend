import http from '../../../lib/api-client'
import type { SetupStatus } from '../types'

export const setupApi = {
  status: async (tenantId: string) => (await http.get<SetupStatus>('/api/v1/setup/status', {
    headers: { 'X-Tenant-ID': tenantId },
  })).data,
}
