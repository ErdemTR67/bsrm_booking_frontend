import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ThemeContext } from '../../features/theme/context/theme-context'
import { ThemeToggle } from './ThemeToggle'

describe('ThemeToggle', () => {
  it('propose le mode sombre depuis le thème clair', () => {
    const markup = renderToStaticMarkup(
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: vi.fn() }}><ThemeToggle /></ThemeContext.Provider>,
    )
    expect(markup).toContain('Mode sombre')
    expect(markup).toContain('Activer le mode sombre')
  })

  it('propose le retour au mode clair depuis le thème sombre', () => {
    const markup = renderToStaticMarkup(
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme: vi.fn() }}><ThemeToggle /></ThemeContext.Provider>,
    )
    expect(markup).toContain('Mode clair')
    expect(markup).toContain('Activer le mode clair')
  })
})
