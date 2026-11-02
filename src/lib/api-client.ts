import axios, { AxiosError, AxiosHeaders } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import type { TokenResponse } from '../features/auth/types'
import type { ApiErrorPayload } from '../types/api'
import {
  clearSessionStorage,
  getAccessToken,
  getRefreshToken,
  getSelectedTenantId,
  saveTokens,
} from './auth'
import { isConfigurationWriteRequest, setConfigurationAccess } from './configuration-access'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

export const AUTH_EXPIRED_EVENT = 'bsrm:auth-expired'
export const AUTH_UPDATED_EVENT = 'bsrm:auth-updated'

export class ApiError extends Error {
  status: number
  code: string
  details: ApiErrorPayload['details']

  constructor(status: number, code: string, message: string, details: ApiErrorPayload['details'] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean }

const publicAuthPaths = [
  '/api/v1/auth/login',
  '/api/v1/auth/invitations/accept',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
]

const isPublicAuthRequest = (url = '') => publicAuthPaths.some((path) => url === path)
export const needsTenantHeader = (url = '') => url.startsWith('/api/v1/')
  && !url.startsWith('/api/v1/auth/')
  && !url.startsWith('/api/v1/platform/')
  && !url.startsWith('/api/v1/tenants')

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: ApiErrorPayload }>
    const payload = axiosError.response?.data?.error
    return new ApiError(
      axiosError.response?.status ?? 0,
      payload?.code ?? (axiosError.response ? 'request_failed' : 'network_error'),
      payload?.message ?? (axiosError.response ? 'La requête a échoué.' : 'Le serveur est injoignable.'),
      payload?.details,
    )
  }

  if (error instanceof Error) return new ApiError(0, 'unexpected_error', error.message)
  return new ApiError(0, 'unexpected_error', 'Une erreur inattendue est survenue.')
}

const http = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
})

const refreshClient = axios.create({ baseURL: API_BASE, timeout: 20_000 })
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise

  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new ApiError(401, 'invalid_refresh_token', 'Votre session a expiré.')

  refreshPromise = refreshClient
    .post<TokenResponse>('/api/v1/auth/refresh', { refresh_token: refreshToken })
    .then(({ data }) => {
      saveTokens(data)
      window.dispatchEvent(new CustomEvent(AUTH_UPDATED_EVENT, { detail: data }))
      return data.access_token
    })
    .catch((error: unknown) => {
      clearSessionStorage()
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
      throw normalizeApiError(error)
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

http.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers)
  const accessToken = getAccessToken()
  const tenantId = getSelectedTenantId()

  if (accessToken && !isPublicAuthRequest(config.url)) headers.set('Authorization', `Bearer ${accessToken}`)
  if (needsTenantHeader(config.url)) {
    if (!headers.has('X-Tenant-ID') && tenantId) headers.set('X-Tenant-ID', tenantId)
  } else {
    headers.delete('X-Tenant-ID')
  }

  config.headers = headers
  return config
})

http.interceptors.response.use(
  (response) => {
    const tenantId = getSelectedTenantId()
    if (tenantId && isConfigurationWriteRequest(response.config.url, response.config.method)) {
      setConfigurationAccess(tenantId, 'granted')
    }
    return response
  },
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(normalizeApiError(error))

    const request = error.config as RetryableRequest | undefined
    const payload = error.response?.data as { error?: ApiErrorPayload } | undefined
    const tenantId = getSelectedTenantId()
    if (
      tenantId
      && error.response?.status === 403
      && payload?.error?.code === 'insufficient_permissions'
      && isConfigurationWriteRequest(request?.url, request?.method)
    ) {
      setConfigurationAccess(tenantId, 'denied')
    }
    if (error.response?.status === 401 && request && !request._retry && !isPublicAuthRequest(request.url)) {
      request._retry = true
      try {
        const accessToken = await refreshAccessToken()
        request.headers = AxiosHeaders.from(request.headers)
        request.headers.set('Authorization', `Bearer ${accessToken}`)
        return http.request(request)
      } catch (refreshError) {
        return Promise.reject(normalizeApiError(refreshError))
      }
    }

    return Promise.reject(normalizeApiError(error))
  },
)

export default http
