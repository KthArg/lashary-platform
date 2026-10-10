import { describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import { AUTH_ROLES, type AuthRole } from '@/features/auth/domain/roles'
import { signInStaff, signOutUser, startGoogleSignIn } from '@/features/auth/application/sign-in'
import { saveClientPhone } from '@/features/auth/application/phone'
import type { AuthRepository } from '@/features/auth/application/ports'

const staffUser = { id: 'user-1', email: 'admin@lashary.test', user_metadata: {} } as unknown as User
const credentials = { email: 'admin@lashary.test', password: 'secreto-123' }

function fakeRepository(overrides: Partial<AuthRepository> = {}): AuthRepository {
  return {
    findRole: vi.fn(async () => null),
    findClientProfile: vi.fn(async () => null),
    saveClientPhone: vi.fn(async () => ({ ok: true })),
    getCurrentUser: vi.fn(async () => staffUser),
    signInWithPassword: vi.fn(async () => staffUser),
    signInWithGoogle: vi.fn(async () => ({ failed: false, url: 'https://accounts.google.com' })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  }
}

function repositoryWithRole(role: AuthRole | null): AuthRepository {
  return fakeRepository({ findRole: vi.fn(async () => role) })
}

describe('application/sign-in', () => {
  it('signInStaff devuelve ok para una usuaria con rol admin', async () => {
    const repository = repositoryWithRole(AUTH_ROLES.ADMIN)
    expect(await signInStaff(repository, credentials)).toEqual({ kind: 'ok' })
    expect(repository.signOut).not.toHaveBeenCalled()
  })

  it('signInStaff devuelve credenciales inválidas si la autenticación falla', async () => {
    const repository = fakeRepository({ signInWithPassword: vi.fn(async () => null) })
    expect(await signInStaff(repository, credentials)).toEqual({ kind: 'invalid-credentials' })
    expect(repository.findRole).not.toHaveBeenCalled()
  })

  it('signInStaff niega el acceso y cierra la sesión si el rol no es de staff', async () => {
    const repository = repositoryWithRole(AUTH_ROLES.CLIENTE)
    expect(await signInStaff(repository, credentials)).toEqual({ kind: 'access-denied' })
    expect(repository.signOut).toHaveBeenCalledTimes(1)
  })

  it('startGoogleSignIn pasa la URL de retorno al repositorio', async () => {
    const repository = fakeRepository()
    const start = await startGoogleSignIn(repository, 'http://localhost:3000/auth/callback')
    expect(repository.signInWithGoogle).toHaveBeenCalledWith('http://localhost:3000/auth/callback')
    expect(start.url).toBe('https://accounts.google.com')
  })

  it('signOutUser cierra la sesión una vez', async () => {
    const repository = fakeRepository()
    await signOutUser(repository)
    expect(repository.signOut).toHaveBeenCalledTimes(1)
  })
})

describe('application/phone', () => {
  it('saveClientPhone avisa si no hay usuaria autenticada', async () => {
    const repository = fakeRepository({ getCurrentUser: vi.fn(async () => null) })
    expect(await saveClientPhone(repository, '88887777')).toEqual({ kind: 'unauthenticated' })
    expect(repository.saveClientPhone).not.toHaveBeenCalled()
  })

  it('saveClientPhone guarda el teléfono con el nombre visible de la usuaria', async () => {
    const repository = fakeRepository()
    expect(await saveClientPhone(repository, '88887777')).toEqual({ kind: 'ok' })
    expect(repository.saveClientPhone).toHaveBeenCalledWith({
      userId: 'user-1',
      fullName: 'admin',
      email: 'admin@lashary.test',
      phone: '88887777',
    })
  })

  it('saveClientPhone devuelve fallo si el repositorio no pudo guardar', async () => {
    const repository = fakeRepository({ saveClientPhone: vi.fn(async () => ({ ok: false })) })
    expect(await saveClientPhone(repository, '88887777')).toEqual({ kind: 'failed' })
  })
})
