import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { SetupStatus } from '../types'
import { SetupProgressPanel } from './SetupStatusBanner'

const status: SetupStatus = {
  is_complete: false,
  progress_percent: 50,
  next_step: 'employee',
  steps: [
    { key: 'location', complete: true },
    { key: 'opening_hours', complete: true },
    { key: 'service', complete: true },
    { key: 'employee', complete: false },
    { key: 'employee_service', complete: false },
    { key: 'employee_availability', complete: false },
  ],
}

describe('SetupProgressPanel', () => {
  it('affiche la progression et la première étape données par le backend', () => {
    const markup = renderToStaticMarkup(
      <SetupProgressPanel status={status} collapsed={false} canConfigure onToggle={vi.fn()} onContinue={vi.fn()} />,
    )
    expect(markup).toContain('Mise en route · 50%')
    expect(markup).toContain('Ajouter un collaborateur réservable')
    expect(markup).toContain('Continuer la configuration')
    expect(markup).toContain('width:50%')
  })

  it('affiche le message prévu après un refus de permission', () => {
    const markup = renderToStaticMarkup(
      <SetupProgressPanel status={status} collapsed={false} canConfigure={false} onToggle={vi.fn()} onContinue={vi.fn()} />,
    )
    expect(markup).toContain('La configuration doit être terminée par un administrateur de l’espace.')
    expect(markup).not.toContain('Continuer la configuration')
  })

  it('reste visible sous sa forme réduite', () => {
    const markup = renderToStaticMarkup(
      <SetupProgressPanel status={status} collapsed canConfigure onToggle={vi.fn()} onContinue={vi.fn()} />,
    )
    expect(markup).toContain('Configuration incomplète')
    expect(markup).toContain('Afficher')
    expect(markup).not.toContain('setup-checklist')
  })
})
