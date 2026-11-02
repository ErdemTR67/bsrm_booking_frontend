import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { WeekdayCheckboxes } from './index'

describe('WeekdayCheckboxes', () => {
  it('affiche les sept jours et marque ceux sélectionnés', () => {
    const markup = renderToStaticMarkup(<WeekdayCheckboxes value={[0, 2, 4]} onChange={vi.fn()} />)
    expect(markup.match(/type="checkbox"/g)).toHaveLength(7)
    expect(markup.match(/weekday-check-active/g)).toHaveLength(3)
    expect(markup).toContain('Lun')
    expect(markup).toContain('Dim')
  })
})
