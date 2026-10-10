import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { CLIENT_PROFILE_COLUMNS, createSupabaseAuthRepository } from '@/features/auth/db/auth-repository'

function supabaseSelecting(select: ReturnType<typeof vi.fn>): SupabaseClient {
  const query = { eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })) }
  select.mockReturnValue(query)
  return { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient
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
})
