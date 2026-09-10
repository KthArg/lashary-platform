import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { PhoneRegistrationModal } from '@/features/auth/components/PhoneRegistrationModal'
import { ClientSidebar } from '@/features/auth/components/ClientSidebar'
import { updateClientPhoneAction } from '@/features/auth/actions/phone-actions'
import { signInWithGoogleAction } from '@/features/auth/actions/auth-actions'
import PortalLayout from '@/app/portal/layout'

const mockRedirect = vi.fn()
const mockGetUser = vi.fn()
const mockSingleRole = vi.fn()
const mockSignInWithOAuth = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      signInWithOAuth: mockSignInWithOAuth,
    },
    from: vi.fn((table: string) => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: table === 'auth_user_roles' ? mockSingleRole : vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  usePathname: () => '/portal/citas',
}))

describe('US-AUTH-02: Autenticación de Clientas con Google y Teléfono', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'c@lashary.com', user_metadata: { full_name: 'Client' } } } })
    mockSingleRole.mockResolvedValue({ data: { role: 'cliente' }, error: null })
  })

  it('Criterio 1: Renderiza el botón accesible para iniciar sesión con Google', () => {
    render(<GoogleSignInButton />)
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeDefined()
  })
  it('Criterio 2: Modal de teléfono se renderiza cuando el perfil lo requiere', () => {
    render(<PhoneRegistrationModal isOpen={true} />)
    expect(screen.getByText(/paso obligatorio/i)).toBeDefined()
  })
  it('Criterio 3: Validación de formato de teléfono rechaza < 8 dígitos o caracteres no numéricos', async () => {
    const fd1 = new FormData(); fd1.append('phone', '123')
    expect((await updateClientPhoneAction(fd1))?.error).toBe('El número de teléfono debe tener al menos 8 dígitos')
    const fd2 = new FormData(); fd2.append('phone', 'invalidphone')
    expect((await updateClientPhoneAction(fd2))?.error).toBe('El teléfono solo debe contener números, espacios o el símbolo +')
  })
  it('Criterio 4: Guarda exitosamente el teléfono en clients_profiles', async () => {
    const fd = new FormData(); fd.append('phone', '88887777')
    expect((await updateClientPhoneAction(fd))?.success).toBe(true)
  })

  it('Criterio 5: Renderiza ClientSidebar con navegación (Citas, Carrito, Cuenta), usuario y cerrar sesión', () => {
    const mockSession = {
      user: { id: 'c1', email: 'cliente@lashary.com' } as any,
      role: 'cliente',
      profile: { full_name: 'Ana García', phone: '88887777' },
    }

    render(<ClientSidebar session={mockSession} />)

    expect(screen.getByText('LASHARY')).toBeDefined()
    expect(screen.getByText('Mis Citas')).toBeDefined()
    expect(screen.getByText('Carrito')).toBeDefined()
    expect(screen.getByText('Mi Cuenta')).toBeDefined()
    expect(screen.getByText('Ana García')).toBeDefined()
    expect(screen.getByText('cliente@lashary.com')).toBeDefined()
    expect(screen.getByText('Tel: 88887777')).toBeDefined()
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeDefined()

    // Colapsar y expandir
    const toggleBtn = screen.getByRole('button', { name: /colapsar barra/i })
    fireEvent.click(toggleBtn)
    expect(screen.queryByText('LASHARY')).toBeNull()

    const expandBtn = screen.getByRole('button', { name: /expandir barra/i })
    fireEvent.click(expandBtn)
    expect(screen.getByText('LASHARY')).toBeDefined()
  })

  it('Criterio 6: signInWithGoogleAction inicia OAuth redirigiendo a /portal/citas', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com' }, error: null })
    await expect(signInWithGoogleAction()).rejects.toThrow('NEXT_REDIRECT:https://accounts.google.com')
    expect(mockSignInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback?next=/portal/citas'),
        }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('https://accounts.google.com')
  })

  it('Criterio 7: PortalLayout redirige a /login si no hay usuario', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    await expect(PortalLayout({ children: <div>Contenido</div> })).rejects.toThrow('NEXT_REDIRECT:/login')
  })

  it('Criterio 8: PortalLayout redirige administradores a /admin/dashboard', async () => {
    mockSingleRole.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })
    await expect(PortalLayout({ children: <div>Contenido</div> })).rejects.toThrow('NEXT_REDIRECT:/admin/dashboard')
  })

  it('Criterio 9: PortalLayout renderiza ClientSidebar para clientes autenticados', async () => {
    const layout = await PortalLayout({ children: <div data-testid="portal-child">Contenido Portal</div> })
    render(layout)
    expect(screen.getByTestId('portal-child')).toBeDefined()
    expect(screen.getByText('Mis Citas')).toBeDefined()
  })
})
