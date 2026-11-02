import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { applyTheme, getInitialTheme, saveTheme } from '../../../lib/theme'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState(getInitialTheme)
  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const nextTheme = current === 'light' ? 'dark' : 'light'
      applyTheme(nextTheme)
      saveTheme(nextTheme)
      return nextTheme
    })
  }, [])
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
