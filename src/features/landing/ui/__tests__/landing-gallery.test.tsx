import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import type { GalleryPair } from '@/features/content'
import { GALLERY_SECTION, LandingGallery, landingMessages } from '@/features/landing'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

afterEach(cleanup)

const copy = landingMessages.gallery

// Un par tal como lo entrega `getGallery()`: ya resuelto contra CMS_URL y con consentimiento.
const par = (family: GalleryPair['family'], name: string): GalleryPair => ({
  family,
  before: { url: `https://cms.test/${name}-antes.jpg`, alt: `${name}, antes` },
  after: { url: `https://cms.test/${name}-despues.jpg`, alt: `${name}, después` },
})

const pares = [par('lash_classic', 'Ana'), par('lash_volume', 'Bea'), par('lash_classic', 'Caro')]

const pares_en_cuadricula = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('LandingGallery — US-LAND-03', () => {
  it('criterio 1: cada par muestra su foto antes y su foto después, etiquetadas', () => {
    render(<LandingGallery pairs={[pares[0]]} />)

    const [tile] = pares_en_cuadricula()
    expect(within(tile).getByAltText('Ana, antes').getAttribute('src')).toBe('https://cms.test/Ana-antes.jpg')
    expect(within(tile).getByAltText('Ana, después').getAttribute('src')).toBe('https://cms.test/Ana-despues.jpg')
    expect(within(tile).getByText(copy.before)).toBeTruthy()
    expect(within(tile).getByText(copy.after)).toBeTruthy()
  })

  it('criterio 3: la cuadrícula muestra todos los pares y se filtra por técnica', () => {
    render(<LandingGallery pairs={pares} />)
    expect(pares_en_cuadricula()).toHaveLength(3)

    const filtros = screen.getByRole('group', { name: copy.filterLabel })
    fireEvent.click(within(filtros).getByRole('button', { name: 'Volumen' }))

    expect(pares_en_cuadricula()).toHaveLength(1)
    expect(screen.getByAltText('Bea, después')).toBeTruthy()
    expect(within(filtros).getByRole('button', { name: 'Volumen' }).getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(within(filtros).getByRole('button', { name: copy.all }))
    expect(pares_en_cuadricula()).toHaveLength(3)
  })

  it('con una sola técnica no ofrece filtros: no hay nada que filtrar', () => {
    render(<LandingGallery pairs={[pares[0], pares[2]]} />)
    expect(screen.queryByRole('group', { name: copy.filterLabel })).toBeNull()
  })

  it('UI-003: sin pares la sección sigue existiendo y explica qué pasa', () => {
    const { container } = render(<LandingGallery pairs={[]} />)

    expect(container.querySelector(`section#${GALLERY_SECTION.id}`)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeTruthy()
    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
