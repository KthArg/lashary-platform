import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { SiteHeader, RESERVE_ROUTE, landingMessages } from '@/features/landing'

afterEach(cleanup)

const sections = [
  { id: 'servicios', label: 'Servicios' },
  { id: 'estudio', label: 'El estudio' },
]

const openMenu = () => {
  render(<SiteHeader sections={sections} />)
  const trigger = screen.getByRole('button', { name: landingMessages.header.openMenu })
  fireEvent.click(trigger)
  return trigger
}

describe('SiteHeader — US-LAND-01: llamado a la acción para agendar', () => {
  it('muestra la marca y "Reservar cita" hacia la ruta interna fija', () => {
    render(<SiteHeader sections={[]} />)
    expect(screen.getByText(landingMessages.brand.name)).toBeTruthy()
    const reserve = screen.getByRole('link', { name: landingMessages.header.reserve })
    expect(reserve.getAttribute('href')).toBe(RESERVE_ROUTE)
    expect(reserve.getAttribute('target')).toBeNull()
  })

  it('sin secciones no hay navegación ni botón de menú', () => {
    render(<SiteHeader sections={[]} />)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('button', { name: landingMessages.header.openMenu })).toBeNull()
  })

  it('con secciones enlaza cada una por su ancla', () => {
    render(<SiteHeader sections={sections} />)
    const nav = screen.getByRole('navigation', { name: landingMessages.header.sectionsNav })
    expect(within(nav).getByRole('link', { name: 'Servicios' }).getAttribute('href')).toBe('#servicios')
    expect(within(nav).getByRole('link', { name: 'El estudio' }).getAttribute('href')).toBe('#estudio')
  })
})

describe('SiteMenu — UI-004: operable con teclado', () => {
  it('al abrir, es un diálogo modal con el foco en "Cerrar" y el botón marca aria-expanded', () => {
    const trigger = openMenu()
    const dialog = screen.getByRole('dialog', { name: landingMessages.menu.dialogLabel })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: landingMessages.menu.close }))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })

  it('numera las secciones y ofrece reservar', () => {
    openMenu()
    const dialog = screen.getByRole('dialog')
    // El número es decorativo (aria-hidden): se ve, pero el nombre accesible es solo la sección.
    const servicios = within(dialog).getByRole('link', { name: 'Servicios' })
    expect(servicios.getAttribute('href')).toBe('#servicios')
    expect(servicios.textContent).toBe('01Servicios')
    expect(within(dialog).getByRole('link', { name: landingMessages.menu.reserve }).getAttribute('href')).toBe(RESERVE_ROUTE)
  })

  it('Escape cierra y devuelve el foco al botón de menú', () => {
    const trigger = openMenu()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('"Cerrar" cierra el menú', () => {
    openMenu()
    fireEvent.click(screen.getByRole('button', { name: landingMessages.menu.close }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('Tab desde el último control vuelve al primero, sin salir del diálogo', () => {
    openMenu()
    const dialog = screen.getByRole('dialog')
    within(dialog).getByRole('link', { name: landingMessages.menu.reserve }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: landingMessages.menu.close }))
  })

  it('bloquea el scroll de la página mientras está abierto', () => {
    openMenu()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })
})
