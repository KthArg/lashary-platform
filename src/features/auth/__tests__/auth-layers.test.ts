import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AUTH_ROLES, isStaffRole, type AuthRole } from '@/features/auth/domain/roles'
import { validateClientPhone } from '@/features/auth/domain/phone'
import { clientDisplayName, loadAuthSession } from '@/features/auth/application/session'
import type { AuthRepository, ClientProfile } from '@/features/auth/application/ports'

const clientUser = { id: 'user-1', email: 'clienta@lashary.test', user_metadata: {} } as unknown as User

function repositoryReturning(role: AuthRole | null, profile: ClientProfile | null): AuthRepository {
  return {
    findRole: vi.fn(async () => role),
    findClientProfile: vi.fn(async () => profile),
    saveClientPhone: vi.fn(async () => ({ ok: true })),
    getCurrentUser: vi.fn(async () => null),
    signInWithPassword: vi.fn(async () => null),
    signInWithGoogle: vi.fn(async () => ({ failed: false, url: null })),
    signOut: vi.fn(async () => undefined),
  }
}

describe('domain/roles', () => {
  it('admin y superadmin son staff; cliente y un rol vacío no', () => {
    expect(isStaffRole(AUTH_ROLES.ADMIN)).toBe(true)
    expect(isStaffRole(AUTH_ROLES.SUPERADMIN)).toBe(true)
    expect(isStaffRole(AUTH_ROLES.CLIENTE)).toBe(false)
    expect(isStaffRole(null)).toBe(false)
  })
})

describe('domain/phone', () => {
  it('acepta un teléfono de 8 a 20 dígitos, espacios o +', () => {
    expect(validateClientPhone('+506 8888 8888')).toBeNull()
  })

  it('rechaza un teléfono corto o con letras', () => {
    expect(validateClientPhone('1234')).toBe('phoneMinLength')
    expect(validateClientPhone('8888-abcd')).toBe('phoneInvalidFormat')
    expect(validateClientPhone(undefined)).toBe('phoneMinLength')
  })
})

describe('application/session', () => {
  it('arma la sesión con el rol y el perfil del repositorio', async () => {
    const session = await loadAuthSession(repositoryReturning(AUTH_ROLES.ADMIN, null), clientUser)
    expect(session.role).toBe(AUTH_ROLES.ADMIN)
    expect(session.profile).toBeNull()
  })

  it('sin rol registrado, la sesión es de cliente', async () => {
    const session = await loadAuthSession(repositoryReturning(null, null), clientUser)
    expect(session.role).toBe(AUTH_ROLES.CLIENTE)
  })

  it('el nombre visible usa el nombre completo o, si falta, el usuario del correo', () => {
    expect(clientDisplayName(clientUser)).toBe('clienta')
    const userWithName = { ...clientUser, user_metadata: { full_name: 'Ana Mora' } } as unknown as User
    expect(clientDisplayName(userWithName)).toBe('Ana Mora')
  })
})
