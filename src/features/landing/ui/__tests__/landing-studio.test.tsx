import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { StudioContent } from '@/features/content'
import { LandingStudio, STUDIO_SECTION, landingMessages } from '@/features/landing'

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

afterEach(cleanup)

const copy = landingMessages.studio

// El estudio tal como lo entrega `getStudio()`, ya validado.
const publicado: Pick<StudioContent, 'profile' | 'credentials'> = {
  profile: {
    name: 'Ana Rojas',
    role: 'Lash artist y fundadora',
    portrait: { url: 'https://cms.test/ana.jpg', alt: 'Ana en su cabina' },
    paragraphs: ['Abrí el estudio en 2019.', 'Hoy trabajo con una clienta por cita.'],
    yearsOfExperience: 7,
  },
  credentials: [
    { title: 'Extensiones clásicas', kind: 'formacion', issuer: 'Academia X', year: 2018 },
    { title: 'Volumen ruso', kind: 'certificacion', issuer: null, year: 2021 },
    { title: 'Lifting', kind: 'certificacion', issuer: 'Marca Y', year: null },
  ],
}

describe('LandingStudio — US-LAND-04', () => {
  it('criterio 1: foto, texto descriptivo y experiencia', () => {
    render(<LandingStudio studio={publicado} />)

    expect(screen.getByAltText('Ana en su cabina').getAttribute('src')).toBe('https://cms.test/ana.jpg')
    expect(screen.getByText('Abrí el estudio en 2019.')).toBeTruthy()
    expect(screen.getByText('Hoy trabajo con una clienta por cita.')).toBeTruthy()
    expect(screen.getByText('Ana Rojas')).toBeTruthy()
    expect(screen.getByText('Lash artist y fundadora')).toBeTruthy()
    expect(screen.getByText('7 años de experiencia')).toBeTruthy()
  })

  it('criterio 2: la trayectoria separa formación y certificaciones, con entidad y año', () => {
    render(<LandingStudio studio={publicado} />)

    expect(screen.getByRole('heading', { level: 3, name: copy.trajectory })).toBeTruthy()
    const [formacion, certificaciones] = screen.getAllByRole('list')
    expect(within(formacion).getByRole('listitem').textContent).toBe('Extensiones clásicas — Academia X · 2018')
    expect(within(certificaciones).getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Volumen ruso — 2021',
      'Lifting — Marca Y',
    ])
    expect(screen.getByRole('heading', { level: 4, name: copy.education })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: copy.certifications })).toBeTruthy()
  })

  it('un año de experiencia se dice en singular', () => {
    render(
      <LandingStudio studio={{ ...publicado, profile: { ...publicado.profile, yearsOfExperience: 1 } }} />,
    )
    expect(screen.getByText('1 año de experiencia')).toBeTruthy()
  })

  it('sin años ni credenciales no deja un bloque de trayectoria vacío', () => {
    render(
      <LandingStudio
        studio={{ profile: { ...publicado.profile, yearsOfExperience: null }, credentials: [] }}
      />,
    )
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('con el respaldo (sin nombre ni retrato) muestra el texto y no inventa a la dueña', () => {
    const { container } = render(
      <LandingStudio
        studio={{
          profile: { name: null, role: 'Lash artist y fundadora', portrait: null, paragraphs: ['Texto del diseño.'], yearsOfExperience: null },
          credentials: [],
        }}
      />,
    )

    expect(screen.getByText('Texto del diseño.')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
    // El rol suelto no dice de quién es: sin nombre, tampoco se muestra.
    expect(screen.queryByText('Lash artist y fundadora')).toBeNull()
  })

  it('la sección lleva el ancla que usa la navegación', () => {
    const { container } = render(<LandingStudio studio={publicado} />)
    expect(container.querySelector(`section#${STUDIO_SECTION.id}`)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: copy.title })).toBeTruthy()
  })
})
