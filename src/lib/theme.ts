export type Theme = 'light' | 'dark'

const THEME_STORAGE_KEY = 'bsrm_theme'

export function resolveTheme(storedTheme: string | null, prefersDark: boolean): Theme {
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return prefersDark ? 'dark' : 'light'
}

export function getInitialTheme(): Theme {
  let storedTheme: string | null = null
  try { storedTheme = localStorage.getItem(THEME_STORAGE_KEY) } catch { /* La préférence de l’appareil reste disponible. */ }
  const prefersDark = typeof window !== 'undefined' && (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
  return resolveTheme(storedTheme, prefersDark)
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

export function saveTheme(theme: Theme) {
  try { localStorage.setItem(THEME_STORAGE_KEY, theme) } catch { /* Le thème reste actif pour la session courante. */ }
}
