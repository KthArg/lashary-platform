import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { AdminSidebar } from '@/features/auth'
import { ClientSidebar } from '@/features/auth/ui/navigation/components/ClientSidebar'
import { AUTH_LABELS } from '@/features/auth/ui/constants/auth-strings'

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn(), usePathname: () => '/portal/cuenta' }))

const clientSession = {
  user: { id: 'c1', email: 'cliente@lashary.com' } as any,
  role: 'cliente',
  profile: { full_name: 'Ana García', phone: '88887777' },
}
const adminSession = { user: { id: 'a1', email: 'admin@lashary.com' } as any, role: 'admin' }

function screenIsWide(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sidebar = () => screen.getByRole('complementary')

describe('barra lateral según la pantalla', () => {
  it('sin tocarla, el ancho y los textos los deciden los breakpoints: cerrada en teléfono, abierta desde md', () => {
    render(<ClientSidebar session={clientSession} />)

    expect(sidebar().className).toContain('w-20 md:w-64')
    expect(screen.getByText(AUTH_LABELS.clientCitasNav).className).toBe('hidden md:inline')
  })

  it('en un teléfono el botón ofrece expandir, y al tocarlo la barra se abre en cualquier pantalla', () => {
    screenIsWide(false)
    render(<ClientSidebar session={clientSession} />)

    fireEvent.click(screen.getByRole('button', { name: AUTH_LABELS.expandSidebar }))

    expect(sidebar().className).toContain('w-64')
    expect(sidebar().className).not.toContain('md:w-64')
    expect(screen.getByText(AUTH_LABELS.clientCitasNav).className).toBe('')
    expect(screen.getByRole('button', { name: AUTH_LABELS.collapseSidebar })).toBeTruthy()
  })

  it('en pantalla ancha el botón ofrece colapsar, y al tocarlo quedan solo los íconos', () => {
    screenIsWide(true)
    render(<ClientSidebar session={clientSession} />)

    fireEvent.click(screen.getByRole('button', { name: AUTH_LABELS.collapseSidebar }))

    expect(sidebar().className).toContain('w-20')
    expect(sidebar().className).not.toContain('md:w-64')
    expect(screen.queryByText(AUTH_LABELS.clientCitasNav)).toBeNull()
  })

  it('la barra de la administradora sigue la misma regla en un teléfono', () => {
    screenIsWide(false)
    render(<AdminSidebar session={adminSession as any} />)

    expect(sidebar().className).toContain('w-20 md:w-64')
    fireEvent.click(screen.getByRole('button', { name: AUTH_LABELS.expandSidebar }))
    expect(sidebar().getAttribute('data-expanded')).toBe('true')
  })
})
