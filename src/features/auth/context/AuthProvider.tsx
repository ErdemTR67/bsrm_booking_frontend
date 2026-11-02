import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../../../lib/api'
import { AUTH_EXPIRED_EVENT } from '../../../lib/api-client'
import { clearSessionStorage, getAccessToken, getRefreshToken, saveTokens } from '../../../lib/auth'
import { queryClient } from '../../../lib/query-client'
import { emitToast } from '../../../lib/toast'
import type { User } from '../types'
import { AuthContext } from './auth-context'
import type { AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>('initializing')

  const clearSession = useCallback(() => {
    clearSessionStorage()
    queryClient.clear()
    setUser(null)
    setStatus('guest')
  }, [])

  useEffect(() => {
    let active = true

    async function restoreSession() {
      if (!getAccessToken() && !getRefreshToken()) {
        if (active) setStatus('guest')
        return
      }

      try {
        const currentUser = await api.auth.me()
        if (active) {
          setUser(currentUser)
          setStatus('authenticated')
        }
      } catch {
        if (active) clearSession()
      }
    }

    void restoreSession()
    return () => { active = false }
  }, [clearSession])

  useEffect(() => {
    const onExpired = () => {
      clearSession()
      emitToast('Votre session a expiré. Veuillez vous reconnecter.', 'error')
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    setStatus('authenticating')
    try {
      const tokens = await api.auth.login(email, password)
      saveTokens(tokens)
      const currentUser = await api.auth.me()
      setUser(currentUser)
      setStatus('authenticated')
      queryClient.clear()
    } catch (error) {
      setStatus('guest')
      throw error
    }
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken()
    try {
      if (refreshToken) await api.auth.logout(refreshToken)
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(() => ({ user, status, login, logout }), [user, status, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
