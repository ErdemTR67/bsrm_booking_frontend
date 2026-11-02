import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AuthStatus = 'initializing' | 'guest' | 'authenticating' | 'authenticated'

export type AuthContextValue = {
  user: User | null
  status: AuthStatus
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return context
}
