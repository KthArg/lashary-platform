import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  RESUBSCRIBE_INACTIVE_FUNCTION,
  UNSUBSCRIBE_INACTIVE_FUNCTION,
  inactiveSubscriptionRepository,
} from '../inactive-subscription-repository'

const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'

function createFakeDb(error: { message: string } | null) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => (calls.push([name, args]), { data: null, error }),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('inactiveSubscriptionRepository', () => {
  it('se da de baja con el token, sin nada que diga quién es la clienta (SEC-004)', async () => {
    const { db, calls } = createFakeDb(null)
    const result = await inactiveSubscriptionRepository(db).unsubscribe(SAMPLE_UUID)
    expect(calls).toEqual([[UNSUBSCRIBE_INACTIVE_FUNCTION, { p_token: SAMPLE_UUID }]])
    expect(isOk(result)).toBe(true)
  })

  it('vuelve a suscribirse con el token', async () => {
    const { db, calls } = createFakeDb(null)
    const result = await inactiveSubscriptionRepository(db).resubscribe(SAMPLE_UUID)
    expect(calls).toEqual([[RESUBSCRIBE_INACTIVE_FUNCTION, { p_token: SAMPLE_UUID }]])
    expect(isOk(result)).toBe(true)
  })

  it('un error de la base es un fallo del repositorio', async () => {
    const { db } = createFakeDb({ message: 'boom' })
    expect(isErr(await inactiveSubscriptionRepository(db).unsubscribe(SAMPLE_UUID))).toBe(true)
    expect(isErr(await inactiveSubscriptionRepository(db).resubscribe(SAMPLE_UUID))).toBe(true)
  })
})
