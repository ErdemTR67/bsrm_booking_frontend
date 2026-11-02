import type { TokenResponse } from '../features/auth/types'

const ACCESS_TOKEN_KEY = 'bsrm_access_token'
const REFRESH_TOKEN_KEY = 'bsrm_refresh_token'
const TENANT_ID_KEY = 'bsrm_tenant_id'
const INVITATION_TOKEN_KEY = 'bsrm_invitation_token'
let invitationTokenInMemory: string | null = null

export const getAccessToken = () => sessionStorage.getItem(ACCESS_TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)
export const getSelectedTenantId = () => localStorage.getItem(TENANT_ID_KEY)
export const getPendingInvitationToken = () => sessionStorage.getItem(INVITATION_TOKEN_KEY)

export function saveTokens(tokens: Pick<TokenResponse, 'access_token' | 'refresh_token'>) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
}

export function saveSelectedTenantId(tenantId: string | null) {
  if (tenantId) localStorage.setItem(TENANT_ID_KEY, tenantId)
  else localStorage.removeItem(TENANT_ID_KEY)
}

export function savePendingInvitationToken(token: string | null) {
  if (token) sessionStorage.setItem(INVITATION_TOKEN_KEY, token)
  else sessionStorage.removeItem(INVITATION_TOKEN_KEY)
}

export function consumeInvitationTokenFromUrl() {
  const url = new URL(window.location.href)
  const token = url.searchParams.get('token')
  if (token) {
    invitationTokenInMemory = token
    url.searchParams.delete('token')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }
  return invitationTokenInMemory
}

export function clearConsumedInvitationToken() {
  invitationTokenInMemory = null
}

export function clearSessionStorage() {
  invitationTokenInMemory = null
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(TENANT_ID_KEY)
  sessionStorage.removeItem(INVITATION_TOKEN_KEY)
}
