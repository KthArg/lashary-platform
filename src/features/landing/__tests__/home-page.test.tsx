import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HomePage } from '../ui/HomePage'
import { FALLBACK_HOME_CONTENT } from '../constants/fallback-home-content'
import { LANDING_STRINGS } from '../constants/landing-strings'

describe('HomePage (US-LAND-01)', () => {
  it('arma el cascarón público: encabezado con la marca, contenido y pie', () => {
    render(<HomePage content={FALLBACK_HOME_CONTENT} />)

    expect(screen.getByRole('banner').textContent).toContain(LANDING_STRINGS.brandName)
    const main = screen.getByRole('main')
    expect(main.contains(screen.getByRole('heading', { level: 1 }))).toBe(true)
    expect(screen.getByRole('contentinfo').textContent).toContain(LANDING_STRINGS.footerRights)
  })

  it('UI-004 — enlace para saltar al contenido y logo que enlaza al inicio', () => {
    render(<HomePage content={FALLBACK_HOME_CONTENT} />)

    expect(
      screen.getByRole('link', { name: LANDING_STRINGS.skipToContent }).getAttribute('href'),
    ).toBe('#contenido')
    expect(
      screen.getByRole('link', { name: LANDING_STRINGS.homeNavLabel }).getAttribute('href'),
    ).toBe('/')
  })
})
