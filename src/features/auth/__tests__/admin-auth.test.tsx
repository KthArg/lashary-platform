import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminLoginForm } from '@/features/auth/components/AdminLoginForm'
import { signInAdminAction, signOutAction, getAuthSession, requireAdminSession } from '@/features/auth/actions/auth-actions'

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockGetUser = vi.fn()
const mockSingleRole = vi.fn()
const mockRedirect = vi.fn()

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

    await expect(signInAdminAction(null, formData)).rejects.toThrow('NEXT_REDIRECT:/')
    expect(mockRedirect).toHaveBeenCalledWith('/')
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

  it('CA-5: Invalida y devuelve nula la sesión cuando el token o sesión expira', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const session = await getAuthSession()
    expect(session).toBeNull()
  })
})
