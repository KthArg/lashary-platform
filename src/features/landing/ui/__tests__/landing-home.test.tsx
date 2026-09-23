import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { LandingContent, StudioContent } from '@/features/content'
import { LandingClosingCta, LandingHome, LandingIntro, RESERVE_ROUTE } from '@/features/landing'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const content: LandingContent = {
  hero: {
    titleLead: 'extensiones de pestañas',
    titleEmphasis: 'una por una.',
    subtitle: 'Cabina propia.',
    ctaLabel: 'Reservar cita',
    secondaryLabel: null,
    secondaryHref: null,
    image: null,
  },
  intro: { statement: 'Tiempo, luz y criterio.', body: 'Reviso tu pestaña primero.' },
  closingCta: { heading: 'La agenda es de una clienta', headingEmphasis: 'a la vez', body: 'Elegís día y hora.', ctaLabel: 'Quiero mi cita' },
}

const studio: StudioContent = {
  profile: { name: 'Ana', role: 'Lash artist y fundadora', portrait: null, paragraphs: ['Abrí el estudio.'], yearsOfExperience: 7 },
  credentials: [],
  reasons: [{ title: 'Una clienta a la vez', text: 'Nadie espera.' }],
}

describe('LandingIntro — texto de bienvenida desde el CMS', () => {
  it('muestra la frase y el párrafo', () => {
    render(<LandingIntro intro={content.intro} />)
    expect(screen.getByText('Tiempo, luz y criterio.')).toBeTruthy()
    expect(screen.getByText('Reviso tu pestaña primero.')).toBeTruthy()
  })

  it('sin párrafo no deja un párrafo vacío', () => {
    const { container } = render(<LandingIntro intro={{ statement: 'Solo la frase.', body: null }} />)
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})

describe('LandingClosingCta — llamada final a reservar', () => {
  it('título con su cierre en cursiva y "Reservar" hacia la ruta interna fija', () => {
    render(<LandingClosingCta closingCta={content.closingCta} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('La agenda es de una clienta a la vez')
    expect(screen.getByRole('link', { name: 'Quiero mi cita' }).getAttribute('href')).toBe(RESERVE_ROUTE)
  })

  it('sin cierre ni texto de apoyo muestra solo título y botón', () => {
    const { container } = render(
      <LandingClosingCta closingCta={{ heading: 'Reservá', headingEmphasis: null, body: null, ctaLabel: 'Reservar cita' }} />,
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Reservá')
    expect(container.querySelector('p')).toBeNull()
  })
})

describe('LandingHome — la página de inicio compone las secciones con el contenido recibido', () => {
  it('hero, bienvenida, servicios, El estudio, Por qué acá, galería y llamada final dentro de <main id="inicio">', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    const { container } = render(<LandingHome content={content} studio={studio} />)
    const main = container.querySelector('main#inicio') as HTMLElement
    expect(within(main).getByRole('heading', { level: 1 }).textContent).toBe('extensiones de pestañasuna por una.')
    expect(within(main).getByText('Tiempo, luz y criterio.')).toBeTruthy()
    // En el orden del diseño: Servicios (US-LAND-02), El estudio y Por qué acá (US-LAND-04),
    // Galería (US-LAND-03) y la llamada final.
    const encabezados = within(main).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(encabezados).toEqual([
      'Servicios',
      'El estudio',
      'Por qué acá',
      'Galería',
      'La agenda es de una clienta a la vez',
    ])
    const reserveLinks = within(main).getAllByRole('link').filter((link) => link.getAttribute('href') === RESERVE_ROUTE)
    expect(reserveLinks).toHaveLength(2)
  })

  it('sin técnicas la sección de servicios sigue montada, con su estado vacío', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    const { container } = render(<LandingHome content={content} techniques={[]} />)
    expect(container.querySelector('main#inicio section#servicios')).toBeTruthy()
  })

  it('sin pares la galería sigue montada, con su estado vacío', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
    const { container } = render(<LandingHome content={content} gallery={[]} />)
    expect(container.querySelector('main#inicio section#galeria')).toBeTruthy()
  })
})
