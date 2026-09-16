import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, renderHook, act, fireEvent } from '@testing-library/react'
import { AdminLoginForm, AdminSidebar, InactivityTimeout, useInactivityTimeout } from '@/features/auth'
import { signInAdminAction, signOutAction, getAuthSession, requireAdminSession } from '@/features/auth/actions/auth-actions'
import AdminLayout from '@/app/admin/layout'
import { middleware } from '@/middleware'
import { NextRequest, NextResponse } from 'next/server'

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockSingleRole = vi.fn()
const mockRedirect = vi.fn()
const mockUpdateSession = vi.fn()

vi.mock('@/shared/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: table === 'auth_user_roles' ? mockSingleRole : vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
  usePathname: () => '/admin/dashboard',
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('US-AUTH-01: Autenticación de Administradores (/admin)', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('Criterio UI: Renderiza campos de correo, contraseña y botón accesible', () => {
    render(<AdminLoginForm />)
    expect(screen.getByLabelText(/correo electrónico/i)).toBeDefined()
    expect(screen.getByLabelText(/contraseña/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /ingresar al panel/i })).toBeDefined()
  })

  it('CA-1: Inicia sesión exitosamente con credenciales válidas y rol administrativo', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: { id: 'admin-id-1', email: 'admin@lashary.com' }, session: {} },
      error: null,
    })
    mockSingleRole.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })

    const formData = new FormData()
    formData.append('email', 'admin@lashary.com')
    formData.append('password', 'validAdminPassword')

    await expect(signInAdminAction(null, formData)).rejects.toThrow('NEXT_REDIRECT:/admin/dashboard')
    expect(mockRedirect).toHaveBeenCalledWith('/admin/dashboard')
  })

  it('CA-2: Invalida la sesión activa y redirige al inicio al cerrar sesión', async () => {
    await expect(signOutAction()).rejects.toThrow('NEXT_REDIRECT:/')
    expect(mockSignOut).toHaveBeenCalledTimes(1)
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('CA-3: Muestra mensaje de error genérico ante credenciales incorrectas o campos vacíos', async () => {
    const emptyForm = new FormData()
    const emptyRes = await signInAdminAction(null, emptyForm)
    expect(emptyRes?.error).toBe('Credenciales inválidas')

    mockSignInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' },
    })
    const formData = new FormData()
    formData.append('email', 'wrong@lashary.com')
    formData.append('password', 'wrong-pass')

    const res = await signInAdminAction(null, formData)
    expect(res?.error).toBe('Credenciales inválidas')
  })

  it('CA-4: Bloquea el acceso a rutas administrativas mediante requireAdminSession si no hay sesión o rol admin', async () => {
    // Caso 1: Sin sesión activa -> Redirige a /admin
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    await expect(requireAdminSession()).rejects.toThrow('NEXT_REDIRECT:/admin')
    expect(mockRedirect).toHaveBeenCalledWith('/admin')

    // Caso 2: Con sesión pero rol 'cliente' -> Redirige a /admin
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'c1', email: 'c@lashary.com' } } })
    mockSingleRole.mockResolvedValueOnce({ data: { role: 'cliente' }, error: null })
    await expect(requireAdminSession()).rejects.toThrow('NEXT_REDIRECT:/admin')
  })

  it('CA-4: Bloquea el acceso a subrutas /admin/* en middleware si no hay sesión autenticada', async () => {
    // Subruta administrativa sin usuario -> Redirige a /admin
    mockUpdateSession.mockResolvedValueOnce({
      supabaseResponse: NextResponse.next(),
      user: null,
    })
    const protectedReq = new NextRequest('http://localhost:3000/admin/dashboard')
    const response = await middleware(protectedReq)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/admin')

    // Subruta administrativa con usuario -> Permite continuar
    mockUpdateSession.mockResolvedValueOnce({
      supabaseResponse: NextResponse.next(),
      user: { id: 'admin-1', email: 'admin@lashary.com' },
    })
    const allowedReq = new NextRequest('http://localhost:3000/admin/dashboard')
    const allowedRes = await middleware(allowedReq)
    expect(allowedRes.status).toBe(200)
  })

  it('CA-5: Invalida y devuelve nula la sesión cuando el token o sesión expira', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const session = await getAuthSession()
    expect(session).toBeNull()
  })

  it('CA-5: Finaliza la sesión de forma automática tras un periodo de inactividad', () => {
    vi.useFakeTimers()
    const onTimeoutMock = vi.fn()
    const { unmount } = renderHook(() =>
      useInactivityTimeout({
        timeoutMs: 1000,
        checkIntervalMs: 200,
        onTimeout: onTimeoutMock,
      })
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onTimeoutMock).not.toHaveBeenCalled()

    // Registrar actividad resetea el temporizador
    act(() => {
      window.dispatchEvent(new Event('mousemove'))
      vi.advanceTimersByTime(600)
    })
    expect(onTimeoutMock).not.toHaveBeenCalled()

    // Superar el tiempo de inactividad ejecuta el callback
    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(onTimeoutMock).toHaveBeenCalledTimes(1)

    unmount()
    vi.useRealTimers()
  })

  it('CA-5: Renderiza InactivityTimeout como componente nulo sin romper UI', () => {
    const { container } = render(<InactivityTimeout enabled={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('CA-2: Renderiza AdminSidebar con navegación persistente, usuario y botón de cerrar sesión', () => {
    const mockSession = {
      user: { id: 'admin-1', email: 'admin@lashary.com' } as any,
      role: 'admin',
    }

    render(<AdminSidebar session={mockSession} />)

    expect(screen.getByText('LASHARY')).toBeDefined()
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Citas')).toBeDefined()
    expect(screen.getByText('Clientas')).toBeDefined()
    expect(screen.getByText('admin@lashary.com')).toBeDefined()
    expect(screen.getByText('admin')).toBeDefined()
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeDefined()

    // Permite colapsar y expandir la barra lateral
    const toggleBtn = screen.getByRole('button', { name: /colapsar barra/i })
    fireEvent.click(toggleBtn)
    expect(screen.queryByText('LASHARY')).toBeNull()

    const expandBtn = screen.getByRole('button', { name: /expandir barra/i })
    fireEvent.click(expandBtn)
    expect(screen.getByText('LASHARY')).toBeDefined()
  })

  it('CA-2: AdminLayout envuelve con AdminSidebar a administradores y renderiza children plano para no-admins', async () => {
    // Caso 1: Admin autenticado -> monta sidebar y contenido
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'admin-1', email: 'admin@lashary.com' } } })
    mockSingleRole.mockResolvedValueOnce({ data: { role: 'admin' }, error: null })

    const adminJsx = await AdminLayout({ children: <div>Contenido Admin</div> })
    const { unmount } = render(adminJsx)
    expect(screen.getByText('Contenido Admin')).toBeDefined()
    expect(screen.getByText('LASHARY')).toBeDefined()
    expect(screen.getByText('Dashboard')).toBeDefined()
    unmount()

    // Caso 2: Sin sesión -> renderiza solo children sin sidebar
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const unauthJsx = await AdminLayout({ children: <div>Contenido Bare</div> })
    render(unauthJsx)
    expect(screen.getByText('Contenido Bare')).toBeDefined()
    expect(screen.queryByText('Dashboard')).toBeNull()
  })
})
