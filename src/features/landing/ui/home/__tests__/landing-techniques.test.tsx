import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import type { TechniqueView } from '@/features/catalog'
import type { TechniqueMediaByFamily } from '@/features/content'
import {
  LandingTechniques,
  toLandingTechnique,
  RESERVE_ROUTE,
  TECHNIQUES_SECTION,
  landingSections,
} from '@/features/landing'

afterEach(cleanup)

const makeTechnique = (overrides: Partial<TechniqueView> = {}): TechniqueView => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Set clásico',
  family: 'lash_classic',
  priceFirstTime: 25000,
  priceRetouch: 15000,
  durationFirstTimeMin: 120,
  durationRetouchMin: 75,
  bufferMin: 15,
  reapplicationIntervalDays: 21,
  deposit: 10000,
  aftercareText: 'No mojar por 24 horas.',
  isActive: true,
  ...overrides,
})

const renderSection = (techniques: TechniqueView[], media: TechniqueMediaByFamily = {}) =>
  render(
    <LandingTechniques techniques={techniques.map((technique) => toLandingTechnique(technique, media))} />,
  )

const photos: TechniqueMediaByFamily = {
  lash_classic: {
    image: { url: 'https://cms.test/clasico.jpg', alt: 'Mirada con set clásico' },
    examples: [
      { url: 'https://cms.test/clasico-1.jpg', alt: 'Resultado a los 7 días' },
      { url: 'https://cms.test/clasico-2.jpg', alt: 'Resultado recién aplicado' },
    ],
  },
}

describe('LandingTechniques — US-LAND-02', () => {
  it('criterio 2: cada técnica muestra su precio y su duración, tomados del catálogo', () => {
    renderSection([makeTechnique()])

    const row = screen.getByRole('button', { name: /Set clásico/ })
    expect(within(row).getByText('120 min')).toBeTruthy()
    expect(row.textContent).toContain('25')
    expect(row.textContent).not.toContain('25000')
  })

  it('criterio 3: con precio de retoque muestra los dos precios', () => {
    renderSection([makeTechnique()])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByText(/Primera vez:/)).toBeTruthy()
    const touchUp = screen.getByText(/Retoque:/)
    expect(touchUp.textContent).toContain('15')
    expect(touchUp.textContent).toContain('75 min')
  })

  it('criterio 3: sin precio de retoque no inventa un segundo precio', () => {
    renderSection([makeTechnique({ name: 'Laminado de cejas', family: 'brow_lamination', priceRetouch: null, durationRetouchMin: null })])

    fireEvent.click(screen.getByRole('button', { name: /Laminado de cejas/ }))

    expect(screen.getByText(/Primera vez:/)).toBeTruthy()
    expect(screen.queryByText(/Retoque:/)).toBeNull()
  })

  it('criterio 1: al abrir la técnica muestra su descripción', () => {
    renderSection([makeTechnique()])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByText(/Una extensión por cada pestaña natural/)).toBeTruthy()
  })

  it('criterio 4: lista las técnicas que entrega el catálogo, en su orden', () => {
    renderSection([
      makeTechnique(),
      makeTechnique({ id: '22222222-2222-4222-8222-222222222222', name: 'Set volumen', family: 'lash_volume' }),
    ])

    const names = screen.getAllByRole('button').map((button) => button.textContent ?? '')
    expect(names[0]).toContain('Set clásico')
    expect(names[1]).toContain('Set volumen')
  })

  it('criterio 5: cada técnica abierta enlaza a reservar esa misma técnica', () => {
    const technique = makeTechnique()
    renderSection([technique])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    const link = screen.getByRole('link', { name: 'Reservar esta técnica' })
    expect(link.getAttribute('href')).toBe(`${RESERVE_ROUTE}?tecnica=${technique.id}`)
  })

  it('acordeón: abre una fila a la vez y la abierta se cierra al volver a pulsarla', () => {
    renderSection([
      makeTechnique(),
      makeTechnique({ id: '22222222-2222-4222-8222-222222222222', name: 'Set volumen', family: 'lash_volume' }),
    ])

    const classic = screen.getByRole('button', { name: /Set clásico/ })
    const volume = screen.getByRole('button', { name: /Set volumen/ })

    fireEvent.click(classic)
    expect(classic.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(volume)
    expect(classic.getAttribute('aria-expanded')).toBe('false')
    expect(volume.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(volume)
    expect(volume.getAttribute('aria-expanded')).toBe('false')
  })

  it('UI-004: aria-controls apunta a un nodo real, con la fila abierta y con la fila cerrada', () => {
    renderSection([makeTechnique()])

    const row = screen.getByRole('button', { name: /Set clásico/ })
    const panelId = row.getAttribute('aria-controls') ?? ''
    expect(panelId).not.toBe('')

    const closed = document.getElementById(panelId)
    expect(closed).toBeTruthy()
    expect(closed?.hasAttribute('hidden')).toBe(true)

    fireEvent.click(row)

    const opened = document.getElementById(panelId)
    expect(opened).toBeTruthy()
    expect(opened?.hasAttribute('hidden')).toBe(false)
  })

  it('criterio 1: la técnica abierta muestra su imagen y sus ejemplos de resultado', () => {
    renderSection([makeTechnique()], photos)

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByAltText('Mirada con set clásico')).toBeTruthy()
    expect(screen.getByAltText('Resultado a los 7 días')).toBeTruthy()
    expect(screen.getByAltText('Resultado recién aplicado')).toBeTruthy()
  })

  it('criterio 1: una técnica sin fotos en el CMS se muestra igual, sin imágenes', () => {
    renderSection([makeTechnique({ name: 'Set volumen', family: 'lash_volume' })], photos)

    fireEvent.click(screen.getByRole('button', { name: /Set volumen/ }))

    expect(screen.getByText(/Abanicos hechos a mano/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('UI-003: sin técnicas la sección sigue existiendo y explica qué pasa', () => {
    const { container } = renderSection([])

    expect(container.querySelector(`#${TECHNIQUES_SECTION.id}`)).toBeTruthy()
    expect(screen.getByText(/El catálogo se está actualizando/)).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('la sección está en la navegación del sitio, así que su ancla existe', () => {
    const { container } = renderSection([makeTechnique()])

    expect(landingSections.some((section) => section.id === TECHNIQUES_SECTION.id)).toBe(true)
    expect(container.querySelector(`#${TECHNIQUES_SECTION.id}`)).toBeTruthy()
  })
})
