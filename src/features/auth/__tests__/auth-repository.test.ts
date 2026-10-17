import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  CLIENT_PROFILE_COLUMNS,
  NO_ROWS_ERROR_CODE,
  createSupabaseAuthRepository,
} from '@/features/auth/db/auth-repository'

function supabaseSelecting(select: ReturnType<typeof vi.fn>): SupabaseClient {
  const query = { eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })) }
  select.mockReturnValue(query)
  return { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient
}

function supabaseResolving(result: {
  data: unknown
  error: { code: string; message: string } | null
}): SupabaseClient {
  const query = { eq: vi.fn(() => ({ single: vi.fn(async () => result) })) }
  return { from: vi.fn(() => ({ select: vi.fn(() => query) })) } as unknown as SupabaseClient
}

describe('db/auth-repository', () => {
  it('findClientProfile pide columnas explícitas y nunca las notas privadas', async () => {
    const select = vi.fn()
    const repository = createSupabaseAuthRepository(supabaseSelecting(select))
    await repository.findClientProfile('user-1')

    expect(select).toHaveBeenCalledWith(CLIENT_PROFILE_COLUMNS)
    expect(CLIENT_PROFILE_COLUMNS).not.toContain('*')
    expect(CLIENT_PROFILE_COLUMNS.split(', ')).not.toContain('notes')
  })

  it('findRole devuelve null cuando la usuaria no tiene fila de rol', async () => {
    const repository = createSupabaseAuthRepository(
      supabaseResolving({ data: null, error: { code: NO_ROWS_ERROR_CODE, message: 'sin filas' } }),
    )

    await expect(repository.findRole('user-1')).resolves.toBeNull()
  })

  it('findRole lanza si la lectura falla por otra causa, en vez de tratarlo como sin rol', async () => {
    const repository = createSupabaseAuthRepository(
      supabaseResolving({ data: null, error: { code: '08006', message: 'conexión caída' } }),
    )

    await expect(repository.findRole('user-1')).rejects.toThrow('auth_user_roles.findRole: conexión caída')
  })

  it('findClientProfile lanza si la lectura falla por otra causa', async () => {
    const repository = createSupabaseAuthRepository(
      supabaseResolving({ data: null, error: { code: '08006', message: 'conexión caída' } }),
    )

    await expect(repository.findClientProfile('user-1')).rejects.toThrow(
      'clients_profiles.findClientProfile: conexión caída',
    )
  })
})
