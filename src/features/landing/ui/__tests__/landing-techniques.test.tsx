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

// Una técnica tal como la entrega el entry point de `catalog` (docs/contracts/catalog-api.md).
const catalogo = (overrides: Partial<TechniqueView> = {}): TechniqueView => ({
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

const seccion = (techniques: TechniqueView[], media: TechniqueMediaByFamily = {}) =>
  render(
    <LandingTechniques techniques={techniques.map((t) => toLandingTechnique(t, media))} />,
  )

// Fotos tal como las entrega el gateway del CMS, ya resueltas contra CMS_URL.
const fotos: TechniqueMediaByFamily = {
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
    seccion([catalogo()])

    const fila = screen.getByRole('button', { name: /Set clásico/ })
    expect(within(fila).getByText('120 min')).toBeTruthy()
    // Intl da el formato de es-CR; lo que importa es que el monto del catálogo esté.
    expect(fila.textContent).toContain('25')
    expect(fila.textContent).not.toContain('25000')
  })

  it('criterio 3: con precio de retoque muestra los dos precios', () => {
    seccion([catalogo()])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByText(/Primera vez:/)).toBeTruthy()
    const retoque = screen.getByText(/Retoque:/)
    expect(retoque.textContent).toContain('15')
    expect(retoque.textContent).toContain('75 min')
  })

  it('criterio 3: sin precio de retoque no inventa un segundo precio', () => {
    seccion([catalogo({ name: 'Laminado de cejas', family: 'brow_lamination', priceRetouch: null, durationRetouchMin: null })])

    fireEvent.click(screen.getByRole('button', { name: /Laminado de cejas/ }))

    expect(screen.getByText(/Primera vez:/)).toBeTruthy()
    expect(screen.queryByText(/Retoque:/)).toBeNull()
  })

  it('criterio 1: al abrir la técnica muestra su descripción', () => {
    seccion([catalogo()])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByText(/Una extensión por cada pestaña natural/)).toBeTruthy()
  })

  it('criterio 4: lista las técnicas que entrega el catálogo, en su orden', () => {
    seccion([
      catalogo(),
      catalogo({ id: '22222222-2222-4222-8222-222222222222', name: 'Set volumen', family: 'lash_volume' }),
    ])

    const nombres = screen.getAllByRole('button').map((boton) => boton.textContent ?? '')
    expect(nombres[0]).toContain('Set clásico')
    expect(nombres[1]).toContain('Set volumen')
  })

  it('criterio 5: cada técnica abierta enlaza a reservar esa misma técnica', () => {
    const tecnica = catalogo()
    seccion([tecnica])

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    const enlace = screen.getByRole('link', { name: 'Reservar esta técnica' })
    expect(enlace.getAttribute('href')).toBe(`${RESERVE_ROUTE}?tecnica=${tecnica.id}`)
  })

  it('acordeón: abre una fila a la vez y la abierta se cierra al volver a pulsarla', () => {
    seccion([
      catalogo(),
      catalogo({ id: '22222222-2222-4222-8222-222222222222', name: 'Set volumen', family: 'lash_volume' }),
    ])

    const clasico = screen.getByRole('button', { name: /Set clásico/ })
    const volumen = screen.getByRole('button', { name: /Set volumen/ })

    fireEvent.click(clasico)
    expect(clasico.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(volumen)
    expect(clasico.getAttribute('aria-expanded')).toBe('false')
    expect(volumen.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(volumen)
    expect(volumen.getAttribute('aria-expanded')).toBe('false')
  })

  it('UI-004: aria-controls apunta a un nodo real, con la fila abierta y con la fila cerrada', () => {
    seccion([catalogo()])

    const fila = screen.getByRole('button', { name: /Set clásico/ })
    const panelId = fila.getAttribute('aria-controls') ?? ''
    expect(panelId).not.toBe('')

    // Cerrada: el panel sigue en el documento —si no, la referencia queda colgando— pero oculto.
    const cerrado = document.getElementById(panelId)
    expect(cerrado).toBeTruthy()
    expect(cerrado?.hasAttribute('hidden')).toBe(true)

    fireEvent.click(fila)

    const abierto = document.getElementById(panelId)
    expect(abierto).toBeTruthy()
    expect(abierto?.hasAttribute('hidden')).toBe(false)
  })

  it('criterio 1: la técnica abierta muestra su imagen y sus ejemplos de resultado', () => {
    seccion([catalogo()], fotos)

    fireEvent.click(screen.getByRole('button', { name: /Set clásico/ }))

    expect(screen.getByAltText('Mirada con set clásico')).toBeTruthy()
    expect(screen.getByAltText('Resultado a los 7 días')).toBeTruthy()
    expect(screen.getByAltText('Resultado recién aplicado')).toBeTruthy()
  })

  it('criterio 1: una técnica sin fotos en el CMS se muestra igual, sin imágenes', () => {
    // El catálogo manda qué técnicas existen; el CMS solo las ilustra.
    seccion([catalogo({ name: 'Set volumen', family: 'lash_volume' })], fotos)

    fireEvent.click(screen.getByRole('button', { name: /Set volumen/ }))

    expect(screen.getByText(/Abanicos hechos a mano/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('UI-003: sin técnicas la sección sigue existiendo y explica qué pasa', () => {
    const { container } = seccion([])

    expect(container.querySelector(`#${TECHNIQUES_SECTION.id}`)).toBeTruthy()
    expect(screen.getByText(/El catálogo se está actualizando/)).toBeTruthy()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('la sección está en la navegación del sitio, así que su ancla existe', () => {
    const { container } = seccion([catalogo()])

    expect(landingSections.some((s) => s.id === TECHNIQUES_SECTION.id)).toBe(true)
    expect(container.querySelector(`#${TECHNIQUES_SECTION.id}`)).toBeTruthy()
  })
})
