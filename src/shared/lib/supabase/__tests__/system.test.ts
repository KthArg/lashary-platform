import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { closeSystemClient, readSystemClientConfigFromEnv } from '../system'

describe('readSystemClientConfigFromEnv', () => {
  it('es null si falta cualquiera de las dos variables', () => {
    expect(readSystemClientConfigFromEnv({})).toBeNull()
    expect(readSystemClientConfigFromEnv({ NOTIFICATIONS_CRON_EMAIL: 'cron@lashary.example' })).toBeNull()
  })

  it('lee email y contraseña cuando están las dos', () => {
    expect(readSystemClientConfigFromEnv({
      NOTIFICATIONS_CRON_EMAIL: 'cron@lashary.example', NOTIFICATIONS_CRON_PASSWORD: 'secreto',
    })).toEqual({ email: 'cron@lashary.example', password: 'secreto' })
  })
})

describe('closeSystemClient', () => {
  it('cierra solo la sesión local, no todas las de la cuenta (corrección del líder, 2026-10-24)', async () => {
    const signOut = vi.fn(async () => ({ error: null }))
    const fakeClient = { auth: { signOut } } as unknown as SupabaseClient

    await closeSystemClient(fakeClient)

    expect(signOut).toHaveBeenCalledTimes(1)
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
