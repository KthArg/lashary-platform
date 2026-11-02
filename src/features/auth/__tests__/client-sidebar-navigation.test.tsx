import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ClientSidebar } from '@/features/auth/ui/navigation/components/ClientSidebar'
import { AUTH_LABELS, CLIENT_PORTAL_ROUTES } from '@/features/auth/ui/constants/auth-strings'

const pathname = vi.hoisted(() => ({ current: '/portal/citas' as string | null }))

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  usePathname: () => pathname.current,
}))

afterEach(() => {
  cleanup()
  pathname.current = CLIENT_PORTAL_ROUTES.citas
})

const session = {
  user: { id: 'c1', email: 'cliente@lashary.com' } as any,
  role: 'cliente',
  profile: { full_name: 'Ana García', phone: '88887777' },
}

function myAppointmentsLink() {
  return screen.getByRole('link', { name: AUTH_LABELS.clientCitasNav })
}

describe('ClientSidebar — Mis Citas', () => {
  it('"Mis Citas" lleva a la lista de citas, no a la pantalla de agendar', () => {
    render(<ClientSidebar session={session} />)

    expect(myAppointmentsLink().getAttribute('href')).toBe(CLIENT_PORTAL_ROUTES.misCitas)
  })

  it('"Mis Citas" queda marcado en toda la sección de citas, también al agendar', () => {
    const appointmentRoutes = [
      CLIENT_PORTAL_ROUTES.misCitas,
      CLIENT_PORTAL_ROUTES.citas,
      `${CLIENT_PORTAL_ROUTES.citas}/calendario/confirmar`,
    ]

    for (const route of appointmentRoutes) {
      pathname.current = route
      const { unmount } = render(<ClientSidebar session={session} />)
      expect(myAppointmentsLink().getAttribute('aria-current')).toBe('page')
      unmount()
    }
  })

  it('en el carrito queda marcado solo "Carrito"', () => {
    pathname.current = CLIENT_PORTAL_ROUTES.carrito
    render(<ClientSidebar session={session} />)

    expect(screen.getByRole('link', { name: AUTH_LABELS.clientCartNav }).getAttribute('aria-current')).toBe('page')
    expect(myAppointmentsLink().getAttribute('aria-current')).toBeNull()
  })
})
