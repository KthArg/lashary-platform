import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
import { SiteHeader, LOGIN_ROUTE, PORTAL_ROUTE, RESERVE_ROUTE, landingMessages } from '@/features/landing'

const pathname = vi.hoisted(() => ({ current: null as string | null }))
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current }))

afterEach(() => {
  cleanup()
  pathname.current = null
})

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

  it('ofrece "Iniciar sesión" hacia la página de acceso, con y sin secciones', () => {
    const { unmount } = render(<SiteHeader sections={[]} />)
    expect(screen.getByRole('link', { name: landingMessages.header.login }).getAttribute('href')).toBe(LOGIN_ROUTE)
    unmount()
    render(<SiteHeader sections={sections} />)
    expect(screen.getByRole('link', { name: landingMessages.header.login }).getAttribute('href')).toBe(LOGIN_ROUTE)
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

  it('ofrece iniciar sesión y cierra el menú al elegirlo', () => {
    openMenu()
    const dialog = screen.getByRole('dialog')
    const login = within(dialog).getByRole('link', { name: landingMessages.menu.login })
    expect(login.getAttribute('href')).toBe(LOGIN_ROUTE)
    fireEvent.click(login)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('numera las secciones y ofrece reservar', () => {
    openMenu()
    const dialog = screen.getByRole('dialog')
    const servicesLink = within(dialog).getByRole('link', { name: 'Servicios' })
    expect(servicesLink.getAttribute('href')).toBe('#servicios')
    expect(servicesLink.textContent).toBe('01Servicios')
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
    within(dialog).getByRole('link', { name: landingMessages.menu.login }).focus()
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

describe('SiteHeader — fuera de la portada (US-BLOG-02)', () => {
  it('en /blog la marca y las secciones vuelven a la portada, no a un ancla que no existe', () => {
    pathname.current = '/blog'
    render(<SiteHeader sections={sections} />)

    const nav = screen.getByRole('navigation', { name: landingMessages.header.sectionsNav })
    expect(within(nav).getByRole('link', { name: 'Servicios' }).getAttribute('href')).toBe('/#servicios')
    expect(screen.getByRole('link', { name: /LASHARY/ }).getAttribute('href')).toBe('/#inicio')
  })

  it('en /blog el menú del teléfono también vuelve a la portada', () => {
    pathname.current = '/blog'
    openMenu()

    const dialog = screen.getByRole('dialog', { name: landingMessages.menu.dialogLabel })
    expect(within(dialog).getByRole('link', { name: /El estudio/ }).getAttribute('href')).toBe('/#estudio')
  })

  it('en la portada las secciones siguen siendo anclas de la misma página', () => {
    pathname.current = '/'
    render(<SiteHeader sections={sections} />)

    const nav = screen.getByRole('navigation', { name: landingMessages.header.sectionsNav })
    expect(within(nav).getByRole('link', { name: 'Servicios' }).getAttribute('href')).toBe('#servicios')
  })
})

describe('SiteHeader — enlace a la página de productos', () => {
  const productsHref = '/productos'

  it('con la ruta de productos, la cabecera enlaza a ella', () => {
    render(<SiteHeader sections={sections} productsHref={productsHref} />)

    const products = screen.getByRole('link', { name: landingMessages.header.products })
    expect(products.getAttribute('href')).toBe(productsHref)
  })

  it('sin la ruta de productos, la cabecera no muestra el enlace', () => {
    render(<SiteHeader sections={sections} />)

    expect(screen.queryByRole('link', { name: landingMessages.header.products })).toBeNull()
  })

  it('el menú del teléfono ofrece los productos y se cierra al elegirlos', () => {
    render(<SiteHeader sections={sections} productsHref={productsHref} />)
    fireEvent.click(screen.getByRole('button', { name: landingMessages.header.openMenu }))

    const dialog = screen.getByRole('dialog', { name: landingMessages.menu.dialogLabel })
    const products = within(dialog).getByRole('link', { name: landingMessages.menu.products })
    expect(products.getAttribute('href')).toBe(productsHref)
    fireEvent.click(products)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('SiteHeader — enlace al carrito', () => {
  const cartHref = '/portal/carrito'

  it('con la ruta del carrito, la cabecera enlaza a ella', () => {
    render(<SiteHeader sections={sections} cartHref={cartHref} />)

    const cart = screen.getByRole('link', { name: landingMessages.header.cart })
    expect(cart.getAttribute('href')).toBe(cartHref)
  })

  it('en la cabecera el carrito es un ícono con nombre accesible, a la derecha de "Reservar cita"', () => {
    render(<SiteHeader sections={sections} cartHref={cartHref} />)

    const cart = screen.getByRole('link', { name: landingMessages.header.cart })
    const reserve = screen.getByRole('link', { name: landingMessages.header.reserve })
    expect(cart.textContent).toBe('')
    expect(cart.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(reserve.compareDocumentPosition(cart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sin la ruta del carrito, la cabecera no muestra el enlace', () => {
    render(<SiteHeader sections={sections} />)

    expect(screen.queryByRole('link', { name: landingMessages.header.cart })).toBeNull()
  })

  it('el menú del teléfono ofrece el carrito y se cierra al elegirlo', () => {
    render(<SiteHeader sections={sections} cartHref={cartHref} />)
    fireEvent.click(screen.getByRole('button', { name: landingMessages.header.openMenu }))

    const dialog = screen.getByRole('dialog', { name: landingMessages.menu.dialogLabel })
    const cart = within(dialog).getByRole('link', { name: landingMessages.menu.cart })
    expect(cart.getAttribute('href')).toBe(cartHref)
    fireEvent.click(cart)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('SiteHeader — con la sesión iniciada', () => {
  const PROJECT_URL = 'https://proyecto.supabase.co'
  const SESSION_COOKIE = 'sb-proyecto-auth-token'
  const OTHER_PROJECT_COOKIE = 'sb-localhost-auth-token'

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', PROJECT_URL)
  })

  afterEach(() => {
    document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    document.cookie = `${OTHER_PROJECT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    vi.unstubAllEnvs()
  })

  it('con la cookie que quedó de otro proyecto, la cabecera sigue diciendo "Iniciar sesión"', () => {
    document.cookie = `${OTHER_PROJECT_COOKIE}=sesion-vieja; path=/`
    render(<SiteHeader sections={sections} />)

    expect(screen.getByRole('link', { name: landingMessages.header.login }).getAttribute('href')).toBe(LOGIN_ROUTE)
    expect(screen.queryByRole('link', { name: landingMessages.header.portal })).toBeNull()
  })

  it('con la cookie de sesión, la cabecera ofrece "Mi portal" en vez de "Iniciar sesión"', () => {
    document.cookie = `${SESSION_COOKIE}=valor; path=/`
    render(<SiteHeader sections={sections} />)

    expect(screen.getByRole('link', { name: landingMessages.header.portal }).getAttribute('href')).toBe(PORTAL_ROUTE)
    expect(screen.queryByRole('link', { name: landingMessages.header.login })).toBeNull()
  })

  it('el menú del teléfono también ofrece "Mi portal" con la sesión iniciada', () => {
    document.cookie = `${SESSION_COOKIE}=valor; path=/`
    openMenu()

    const dialog = screen.getByRole('dialog', { name: landingMessages.menu.dialogLabel })
    expect(within(dialog).getByRole('link', { name: landingMessages.menu.portal }).getAttribute('href')).toBe(PORTAL_ROUTE)
    expect(within(dialog).queryByRole('link', { name: landingMessages.menu.login })).toBeNull()
  })

  it('al cerrar sesión se borra la cookie y la cabecera vuelve a "Iniciar sesión"', () => {
    document.cookie = `${SESSION_COOKIE}=valor; path=/`
    const { unmount } = render(<SiteHeader sections={sections} />)
    expect(screen.getByRole('link', { name: landingMessages.header.portal })).toBeTruthy()
    unmount()

    document.cookie = `${SESSION_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    render(<SiteHeader sections={sections} />)
    expect(screen.getByRole('link', { name: landingMessages.header.login }).getAttribute('href')).toBe(LOGIN_ROUTE)
  })
})
