import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { ContactContent } from '@/features/content'
import {
  LOCATION_SECTION,
  RESERVE_ROUTE,
  SiteFooter,
  SiteHeader,
  landingMessages,
  landingSections,
} from '@/features/landing'

afterEach(cleanup)

const copy = landingMessages.footer
const newTab = landingMessages.location.newTab

const contacto: Pick<ContactContent, 'contact' | 'hours'> = {
  contact: {
    address: '200 m norte de la iglesia',
    city: 'Ciudad Quesada, Costa Rica',
    note: null,
    whatsapp: { number: '50688887777', message: 'Hola', href: 'https://wa.me/50688887777?text=Hola' },
    instagram: 'https://instagram.com/lashary',
    facebook: null,
    tiktok: null,
    email: null,
    mapEmbed: null,
    mapLink: null,
  },
  hours: [{ days: 'Lunes a viernes', hours: '9:00 a 18:00' }],
}

const pie = () => screen.getByRole('contentinfo', { name: copy.label })

describe('SiteFooter — US-LAND-07', () => {
  it('criterio 5: el pie de página lleva a Ubicación', () => {
    render(<SiteFooter contact={contacto} year={2026} />)

    expect(within(pie()).getByRole('link', { name: copy.directions }).getAttribute('href')).toBe(
      `/#${LOCATION_SECTION.id}`,
    )
  })

  it('repite contacto, horario y dirección', () => {
    render(<SiteFooter contact={contacto} year={2026} />)

    expect(within(pie()).getByRole('link', { name: `${copy.whatsapp} ${newTab}` }).getAttribute('href')).toBe(
      'https://wa.me/50688887777?text=Hola',
    )
    expect(within(pie()).getByRole('link', { name: `${copy.instagram} ${newTab}` }).getAttribute('href')).toBe(
      'https://instagram.com/lashary',
    )
    expect(within(pie()).getByText('Lunes a viernes: 9:00 a 18:00')).toBeTruthy()
    expect(within(pie()).getByText('200 m norte de la iglesia')).toBeTruthy()
    expect(within(pie()).getByRole('link', { name: copy.reserve }).getAttribute('href')).toBe(RESERVE_ROUTE)
    expect(within(pie()).getByText(copy.rights(2026))).toBeTruthy()
  })

  it('sin contacto publicado muestra solo lo que no depende del CMS', () => {
    render(<SiteFooter contact={{ contact: null, hours: [] }} year={2026} />)

    const enlaces = within(pie()).getAllByRole('link').map((link) => link.textContent)
    expect(enlaces).toEqual([copy.directions, copy.reserve])
  })
})

describe('Navegación — criterio 5: Ubicación desde la navegación principal', () => {
  it('Preguntas y Ubicación cierran la navegación, en el orden de la página', () => {
    expect(landingSections.map((section) => section.id)).toEqual([
      'servicios',
      'estudio',
      'galeria',
      'fidelidad',
      'preguntas',
      LOCATION_SECTION.id,
    ])
  })

  it('la cabecera enlaza a #ubicacion', () => {
    render(<SiteHeader sections={landingSections} />)
    const nav = screen.getByRole('navigation', { name: landingMessages.header.sectionsNav })
    expect(within(nav).getByRole('link', { name: 'Ubicación' }).getAttribute('href')).toBe('#ubicacion')
  })
})
