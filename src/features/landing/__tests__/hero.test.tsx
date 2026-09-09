import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../ui/Hero'
import { FALLBACK_HOME_CONTENT } from '../constants/fallback-home-content'

const cmsContent = {
  heroImage: { url: 'https://cms.test/hero.jpg', alt: 'Trabajo de pestañas' },
  welcomeText: 'Bienvenida escrita en el CMS.',
  ctaLabel: 'Reservar ahora',
}

describe('Hero (US-LAND-01)', () => {
  it('criterio 1 — muestra imagen principal, texto de bienvenida y CTA', () => {
    const { container } = render(<Hero content={FALLBACK_HOME_CONTENT} />)

    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toBe(FALLBACK_HOME_CONTENT.heroImage.url)
    expect(img?.getAttribute('alt')).toBe(FALLBACK_HOME_CONTENT.heroImage.alt)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      FALLBACK_HOME_CONTENT.welcomeText,
    )
    expect(
      screen.getByRole('button', { name: FALLBACK_HOME_CONTENT.ctaLabel }),
    ).toBeTruthy()
  })

  it('criterio 3 — renderiza el contenido que recibe (el que vendrá del CMS)', () => {
    const { container } = render(<Hero content={cmsContent} />)

    expect(container.querySelector('img')?.getAttribute('src')).toBe(cmsContent.heroImage.url)
    expect(screen.getByRole('img', { name: cmsContent.heroImage.alt })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      cmsContent.welcomeText,
    )
    expect(screen.getByRole('button', { name: cmsContent.ctaLabel })).toBeTruthy()
  })

  it('el CTA de agendar va deshabilitado con su explicación (reserva en línea aún no existe)', () => {
    render(<Hero content={FALLBACK_HOME_CONTENT} />)

    const cta = screen.getByRole('button', {
      name: FALLBACK_HOME_CONTENT.ctaLabel,
    }) as HTMLButtonElement
    expect(cta.disabled).toBe(true)
    expect(screen.getByText(/disponible pronto/i)).toBeTruthy()
  })

  it('criterio 2 — declara clases responsivas (verificación manual en el PR a 375px y 1280px)', () => {
    const { container } = render(<Hero content={FALLBACK_HOME_CONTENT} />)
    expect(container.querySelector('section')?.className).toMatch(/\bsm:/)
  })

  it('UI-002 — sin valores arbitrarios de Tailwind en el markup renderizado', () => {
    const { container } = render(<Hero content={FALLBACK_HOME_CONTENT} />)
    expect(container.innerHTML).not.toMatch(/\[(#[0-9a-f]{3,8}|\d+(px|rem|em|vh|vw|%))\]/i)
  })
})
