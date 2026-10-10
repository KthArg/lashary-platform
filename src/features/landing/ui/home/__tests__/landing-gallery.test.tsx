import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import type { GalleryPair } from '@/features/content'
import { GALLERY_SECTION, LandingGallery, landingMessages, landingSections } from '@/features/landing'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

afterEach(cleanup)

const copy = landingMessages.gallery

const makePair = (family: GalleryPair['family'], name: string): GalleryPair => ({
  family,
  before: { url: `https://cms.test/${name}-antes.jpg`, alt: `${name}, antes` },
  after: { url: `https://cms.test/${name}-despues.jpg`, alt: `${name}, después` },
})

const pairs = [makePair('lash_classic', 'Ana'), makePair('lash_volume', 'Bea'), makePair('lash_classic', 'Caro')]

const gridPairs = () => within(screen.getByRole('list')).getAllByRole('button')
const lightbox = () => screen.getByRole('dialog', { name: copy.dialogLabel })

describe('LandingGallery — US-LAND-03', () => {
  it('criterio 1: cada par muestra su foto antes y su foto después, etiquetadas', () => {
    render(<LandingGallery pairs={[pairs[0]]} />)

    const [tile] = gridPairs()
    expect(within(tile).getByAltText('Ana, antes').getAttribute('src')).toBe('https://cms.test/Ana-antes.jpg')
    expect(within(tile).getByAltText('Ana, después').getAttribute('src')).toBe('https://cms.test/Ana-despues.jpg')
    expect(within(tile).getByText(copy.before)).toBeTruthy()
    expect(within(tile).getByText(copy.after)).toBeTruthy()
  })

  it('criterio 3: la cuadrícula muestra todos los pares y se filtra por técnica', () => {
    render(<LandingGallery pairs={pairs} />)
    expect(gridPairs()).toHaveLength(3)

    const filters = screen.getByRole('group', { name: copy.filterLabel })
    fireEvent.click(within(filters).getByRole('button', { name: 'Volumen' }))

    expect(gridPairs()).toHaveLength(1)
    expect(screen.getByAltText('Bea, después')).toBeTruthy()
    expect(within(filters).getByRole('button', { name: 'Volumen' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(within(filters).getByRole('button', { name: copy.all }))
    expect(gridPairs()).toHaveLength(3)
  })

  it('con una sola técnica no ofrece filtros: no hay nada que filtrar', () => {
    render(<LandingGallery pairs={[pairs[0], pairs[2]]} />)
    expect(screen.queryByRole('group', { name: copy.filterLabel })).toBeNull()
  })

  it('criterio 3: la galería ampliada abre el par elegido y recorre los demás con botones y flechas', () => {
    render(<LandingGallery pairs={pairs} />)
    fireEvent.click(gridPairs()[1])

    expect(within(lightbox()).getByAltText('Bea, antes')).toBeTruthy()
    expect(within(lightbox()).getByText('2 / 3')).toBeTruthy()

    fireEvent.click(within(lightbox()).getByRole('button', { name: copy.next }))
    expect(within(lightbox()).getByAltText('Caro, después')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(within(lightbox()).getByText('1 / 3')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'ArrowLeft' })
    expect(within(lightbox()).getByText('3 / 3')).toBeTruthy()
  })

  it('UI-004: la galería ampliada es un diálogo modal que enfoca "Cerrar", y Escape devuelve el foco al par', () => {
    render(<LandingGallery pairs={pairs} />)
    const tile = gridPairs()[2]
    fireEvent.click(tile)

    expect(lightbox().getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(within(lightbox()).getByRole('button', { name: copy.close }))
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(tile)
    expect(document.body.style.overflow).toBe('')
  })

  it('"Cerrar" cierra la galería ampliada', () => {
    render(<LandingGallery pairs={pairs} />)
    fireEvent.click(gridPairs()[0])
    fireEvent.click(within(lightbox()).getByRole('button', { name: copy.close }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('UI-003: sin pares la sección sigue existiendo y explica qué pasa', () => {
    const { container } = render(<LandingGallery pairs={[]} />)

    expect(container.querySelector(`section#${GALLERY_SECTION.id}`)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeTruthy()
    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('la navegación principal enlaza a la galería', () => {
    expect(landingSections).toContainEqual(GALLERY_SECTION)
  })
})
