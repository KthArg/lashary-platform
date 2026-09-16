import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { HeroContent } from '@/features/content'
import { LandingHero, RESERVE_ROUTE } from '@/features/landing'

// next/image necesita el runtime de Next; aquí basta con saber qué imagen y qué alt pide.
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const hero: HeroContent = {
  titleLead: 'extensiones de pestañas',
  titleEmphasis: 'una por una.',
  subtitle: 'Estudio en Ciudad Quesada.',
  ctaLabel: 'Reservar cita',
  secondaryLabel: 'Ver trabajos en Instagram',
  secondaryHref: 'https://instagram.com/lashary',
  image: { url: 'https://x.public.blob.vercel-storage.com/ojo.webp', alt: 'Primer plano de extensiones' },
}

const reducedMotion = (matches: boolean) =>
  vi.stubGlobal('matchMedia', (query: string) => ({ matches, media: query, addEventListener() {}, removeEventListener() {} }))

describe('LandingHero — US-LAND-01 criterio 1: imagen, bienvenida y llamado a agendar', () => {
  it('muestra el título en dos líneas, el texto de bienvenida y la imagen con su alt', () => {
    reducedMotion(false)
    render(<LandingHero hero={hero} />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(title.textContent).toBe('extensiones de pestañasuna por una.')
    expect(screen.getByText('Estudio en Ciudad Quesada.')).toBeTruthy()
    const image = screen.getByRole('img', { name: 'Primer plano de extensiones' })
    expect(image.getAttribute('src')).toBe(hero.image?.url)
  })

  it('"Reservar cita" lleva a la ruta interna fija con el texto del CMS', () => {
    reducedMotion(false)
    render(<LandingHero hero={{ ...hero, ctaLabel: 'Agendar ahora' }} />)
    const cta = screen.getByRole('link', { name: 'Agendar ahora' })
    expect(cta.getAttribute('href')).toBe(RESERVE_ROUTE)
  })

  it('el enlace secundario solo aparece con texto y destino', () => {
    reducedMotion(false)
    render(<LandingHero hero={{ ...hero, secondaryHref: null }} />)
    expect(screen.queryByRole('link', { name: 'Ver trabajos en Instagram' })).toBeNull()
    cleanup()
    render(<LandingHero hero={hero} />)
    expect(screen.getByRole('link', { name: 'Ver trabajos en Instagram' }).getAttribute('href')).toBe(hero.secondaryHref)
  })

  it('sin imagen ni subtítulo (respaldo) no deja una imagen rota ni un párrafo vacío', () => {
    reducedMotion(false)
    render(<LandingHero hero={{ ...hero, image: null, subtitle: null }} />)
    expect(screen.queryByRole('img')).toBeNull()
    const photo = screen.getByTestId('hero-photo')
    expect(photo.getAttribute('aria-hidden')).toBe('true')
    expect(within(photo).queryByRole('img')).toBeNull()
    expect(screen.queryByText('Estudio en Ciudad Quesada.')).toBeNull()
  })

  it('con prefers-reduced-motion no registra la animación de scroll', () => {
    reducedMotion(true)
    const addListener = vi.spyOn(window, 'addEventListener')
    render(<LandingHero hero={hero} />)
    expect(addListener.mock.calls.some(([type]) => type === 'scroll')).toBe(false)
    addListener.mockRestore()
  })
})
