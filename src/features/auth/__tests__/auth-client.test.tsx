import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { PhoneRegistrationModal } from '@/features/auth/components/PhoneRegistrationModal'
import { ClientSidebar } from '@/features/auth/components/ClientSidebar'
import { updateClientPhoneAction } from '@/features/auth/actions/phone-actions'

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'c@lashary.com', user_metadata: { full_name: 'Client' } } } }) },
    from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  usePathname: () => '/portal/citas',
}))

describe('US-AUTH-02: Autenticación de Clientas con Google y Teléfono', () => {
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
})
