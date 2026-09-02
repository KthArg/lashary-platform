import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton'
import { PhoneRegistrationModal } from '@/features/auth/components/PhoneRegistrationModal'
import { updateClientPhoneAction } from '@/features/auth/actions/phone-actions'

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1', email: 'c@lashary.com', user_metadata: { full_name: 'Client' } } } }) },
    from: vi.fn(() => ({ upsert: vi.fn().mockResolvedValue({ error: null }) })),
  })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('US-AUTH-02: Autenticación de Clientas con Google y Teléfono', () => {
  it('Criterio 1: Renderiza el botón accesible para iniciar sesión con Google', () => {
    render(<GoogleSignInButton />)
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeDefined()
  })
  it('Criterio 2: Modal de teléfono se renderiza cuando el perfil lo requiere', () => {
    render(<PhoneRegistrationModal isOpen={true} />)
    expect(screen.getByText(/paso obligatorio/i)).toBeDefined()
  })
  it('Criterio 3: Validación de formato de teléfono rechaza < 8 dígitos', async () => {
    const fd = new FormData(); fd.append('phone', '123')
    const res = await updateClientPhoneAction(fd)
    expect(res?.error).toBe('El número de teléfono debe tener al menos 8 dígitos')
  })
  it('Criterio 4: Guarda exitosamente el teléfono en clients_profiles', async () => {
    const fd = new FormData(); fd.append('phone', '88887777')
    const res = await updateClientPhoneAction(fd)
    expect(res?.success).toBe(true)
  })
})
