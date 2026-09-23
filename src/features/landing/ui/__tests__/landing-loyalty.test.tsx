import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { LoyaltyContent } from '@/features/content'
import {
  LandingLoyalty,
  LOYALTY_SECTION,
  SiteHeader,
  landingMessages,
  landingSections,
} from '@/features/landing'

afterEach(cleanup)

const copy = landingMessages.loyalty

// La fidelidad tal como la entrega `getLoyalty()`, ya validada y con los niveles ordenados.
const publicada: LoyaltyContent = {
  paragraphs: ['Cada cita completada suma una visita.', 'Los beneficios se aplican solos.'],
  note: 'Los beneficios no son acumulables.',
  levels: [
    { visit: 5, benefit: '10 % de descuento', detail: null },
    { visit: 8, benefit: '15 % de descuento', detail: null },
    { visit: 10, benefit: 'Servicio gratis', detail: 'En la técnica que elijas.' },
  ],
}

describe('LandingLoyalty — US-LAND-05', () => {
  it('criterio 1: la mecánica del programa, con qué beneficio da cada visita', () => {
    render(<LandingLoyalty loyalty={publicada} />)

    expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeTruthy()
    expect(screen.getByText('Cada cita completada suma una visita.')).toBeTruthy()
    expect(screen.getByText('Los beneficios no son acumulables.')).toBeTruthy()

    const niveles = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(niveles.map((nivel) => nivel.textContent)).toEqual([
      '5.ª visita10 % de descuento',
      '8.ª visita15 % de descuento',
      '10.ª visitaServicio gratisEn la técnica que elijas.',
    ])
  })

  it('con texto y sin niveles muestra el texto sin una lista vacía', () => {
    render(<LandingLoyalty loyalty={{ ...publicada, levels: [] }} />)

    expect(screen.getByText('Cada cita completada suma una visita.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('UI-003: sin nada publicado la sección sigue existiendo y no inventa beneficios', () => {
    const { container } = render(<LandingLoyalty loyalty={{ paragraphs: [], note: null, levels: [] }} />)

    expect(container.querySelector(`section#${LOYALTY_SECTION.id}`)).toBeTruthy()
    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('la navegación principal enlaza a #fidelidad, después de Galería', () => {
    const ids = landingSections.map((section) => section.id)
    expect(ids.indexOf(LOYALTY_SECTION.id)).toBe(ids.indexOf('galeria') + 1)
    render(<SiteHeader sections={landingSections} />)
    const nav = screen.getByRole('navigation', { name: landingMessages.header.sectionsNav })
    expect(within(nav).getByRole('link', { name: 'Fidelidad' }).getAttribute('href')).toBe('#fidelidad')
  })
})
