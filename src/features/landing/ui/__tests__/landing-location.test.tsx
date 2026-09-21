import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { ContactInfo, OpeningHours } from '@/features/content'
import { LandingLocation, LOCATION_SECTION, landingMessages } from '@/features/landing'

afterEach(cleanup)

const copy = landingMessages.location

// El contacto tal como lo entrega `getContact()`, ya validado.
const contacto: ContactInfo = {
  address: '200 m norte de la iglesia',
  city: 'Ciudad Quesada, Alajuela, Costa Rica',
  note: 'Atención solo con cita reservada.',
  whatsapp: {
    number: '50688887777',
    message: 'Hola, quiero agendar una cita.',
    href: 'https://wa.me/50688887777?text=Hola%2C%20quiero%20agendar%20una%20cita.',
  },
  instagram: 'https://instagram.com/lashary',
  facebook: null,
  tiktok: 'https://tiktok.com/@lashary',
  email: 'hola@lashary.cr',
  mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18',
  mapLink: 'https://maps.app.goo.gl/abc',
}

const horario: OpeningHours[] = [
  { days: 'Lunes a viernes', hours: '9:00 a 18:00' },
  { days: 'Domingo', hours: 'Cerrado' },
]

// El nombre accesible de un enlace externo termina con el aviso de pestaña nueva.
const externo = (name: string) => screen.getByRole('link', { name: `${name} ${copy.newTab}` })

describe('LandingLocation — US-LAND-07', () => {
  it('criterio 1: ubicación, horario y medios de contacto', () => {
    render(<LandingLocation contact={contacto} hours={horario} />)

    expect(screen.getByText('200 m norte de la iglesia')).toBeTruthy()
    expect(screen.getByText('Ciudad Quesada, Alajuela, Costa Rica')).toBeTruthy()
    expect(screen.getByText('Atención solo con cita reservada.')).toBeTruthy()

    const dl = screen.getByRole('heading', { level: 3, name: copy.hours }).nextElementSibling as HTMLElement
    expect(within(dl).getAllByRole('term').map((term) => term.textContent)).toEqual(['Lunes a viernes', 'Domingo'])
    expect(within(dl).getAllByRole('definition').map((def) => def.textContent)).toEqual(['9:00 a 18:00', 'Cerrado'])

    expect(screen.getByRole('link', { name: 'hola@lashary.cr' }).getAttribute('href')).toBe('mailto:hola@lashary.cr')
  })

  it('criterio 2: el botón de WhatsApp abre la conversación con el mensaje inicial', () => {
    render(<LandingLocation contact={contacto} hours={horario} />)

    const whatsapp = externo(copy.whatsapp)
    expect(whatsapp.getAttribute('href')).toBe(contacto.whatsapp?.href)
    expect(whatsapp.getAttribute('target')).toBe('_blank')
    expect(whatsapp.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('criterio 3: las redes, con Instagram primero, y solo las que existen', () => {
    render(<LandingLocation contact={contacto} hours={horario} />)

    expect(externo(copy.instagram).getAttribute('href')).toBe('https://instagram.com/lashary')
    expect(externo(copy.tiktok).getAttribute('href')).toBe('https://tiktok.com/@lashary')
    expect(screen.queryByRole('link', { name: new RegExp(copy.facebook) })).toBeNull()

    const redes = screen.getAllByRole('link').map((link) => link.textContent ?? '')
    expect(redes.findIndex((name) => name.startsWith(copy.instagram))).toBeLessThan(
      redes.findIndex((name) => name.startsWith(copy.tiktok)),
    )
  })

  it('el mapa embebido lleva título y carga diferida; sin él, un enlace para abrirlo', () => {
    const { rerender } = render(<LandingLocation contact={contacto} hours={horario} />)

    const mapa = screen.getByTitle(copy.mapTitle)
    expect(mapa.tagName).toBe('IFRAME')
    expect(mapa.getAttribute('src')).toBe(contacto.mapEmbed)
    expect(mapa.getAttribute('loading')).toBe('lazy')

    rerender(<LandingLocation contact={{ ...contacto, mapEmbed: null }} hours={horario} />)
    expect(screen.queryByTitle(copy.mapTitle)).toBeNull()
    expect(externo(copy.openMap).getAttribute('href')).toBe(contacto.mapLink)
  })

  it('sin WhatsApp válido no hay botón, y el resto se muestra igual', () => {
    render(<LandingLocation contact={{ ...contacto, whatsapp: null }} hours={horario} />)

    expect(screen.queryByRole('link', { name: new RegExp(copy.whatsapp) })).toBeNull()
    expect(externo(copy.instagram)).toBeTruthy()
  })

  it('UI-003: sin contacto ni horario la sección sigue existiendo y no inventa a dónde ir', () => {
    const { container } = render(<LandingLocation contact={null} hours={[]} />)

    expect(container.querySelector(`section#${LOCATION_SECTION.id}`)).toBeTruthy()
    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
