import clsx from 'clsx'
import { useTheme } from '../../features/theme/context/theme-context'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  const label = dark ? 'Mode clair' : 'Mode sombre'

  return (
    <button type="button" className={clsx('theme-toggle', className)} onClick={toggleTheme} aria-label={`Activer le ${label.toLowerCase()}`} title={label}>
      <span className="theme-toggle-icon" aria-hidden="true">{dark ? '☀' : '◐'}</span>
      <span>{label}</span>
    </button>
  )
}
