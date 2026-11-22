import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  CLAIM_INACTIVE_REMINDERS_FUNCTION,
  INACTIVE_REMINDERS_TABLE,
  inactiveReminderDeliveryRepository,
} from '../inactive-reminder-delivery-repository'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES } from '../claim-limits'

const NOW = fixedDate('2047-10-01T12:00:00Z')
const SAMPLE_UUID = '3f2b8c1e-9d4a-4c6b-8e2f-1a7b5c9d0e3f'

const row = {
  id: '00000000-0000-0000-0000-0000000000d1',
  client_id: '00000000-0000-0000-0000-0000000000c1',
  attempts: 1,
  created_at: '2047-10-01T11:00:00+00:00',
  full_name: 'Ana Rodríguez',
  token: SAMPLE_UUID,
}

type FakeResponse = { data?: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['update', 'eq']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('inactiveReminderDeliveryRepository', () => {
  it('reclama con la hora del reloj, de a tandas y con plazo, y trae el nombre y el token de baja', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await inactiveReminderDeliveryRepository(db).claimDue(NOW)

    expect(calls).toEqual([
      ['rpc', CLAIM_INACTIVE_REMINDERS_FUNCTION, {
        p_now: NOW.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      }],
    ])
    expect(isOk(result) && result.value).toEqual([{
      id: row.id,
      clientId: row.client_id,
      clientName: row.full_name,
      unsubscribeToken: row.token,
      attempts: row.attempts,
    }])
  })

  it('una clienta sin nombre llega con el nombre vacío, no rompe el lote', async () => {
    const { db } = createFakeDb({ data: [{ ...row, full_name: null }], error: null })
    const result = await inactiveReminderDeliveryRepository(db).claimDue(NOW)
    expect(isOk(result) && result.value[0].clientName).toBe('')
  })

  it.each([
    ['un error de la base', { data: null, error: { message: 'boom' } }],
    ['una fila sin token', { data: [{ ...row, token: null }], error: null }],
    ['intentos negativos', { data: [{ ...row, attempts: -1 }], error: null }],
  ])('%s es un fallo del repositorio, no un lote vacío', async (_, response) => {
    const { db } = createFakeDb(response)
    expect(isErr(await inactiveReminderDeliveryRepository(db).claimDue(NOW))).toBe(true)
  })

  it('marcar el envío guarda la fecha y el canal, y solo toca un recordatorio reclamado (criterio 3)', async () => {
    const { db, calls } = createFakeDb({ error: null })
    const sentAt = fixedDate('2047-10-01T12:01:00Z')

    await inactiveReminderDeliveryRepository(db).markSent(row.id, 'email', sentAt)

    expect(calls).toEqual([
      ['from', INACTIVE_REMINDERS_TABLE],
      ['update', { status: 'sent', last_channel: 'email', sent_at: sentAt.toISOString() }],
      ['eq', 'id', row.id],
      ['eq', 'status', 'claimed'],
    ])
  })

  it('un reintento vuelve a la cola con los intentos y el error', async () => {
    const { db, calls } = createFakeDb({ error: null })
    await inactiveReminderDeliveryRepository(db).markRetry(row.id, 2, 'timeout')
    expect(calls[1]).toEqual(['update', { status: 'pending', claimed_at: null, attempts: 2, last_error: 'timeout' }])
  })

  it('agotados los intentos queda fallido', async () => {
    const { db, calls } = createFakeDb({ error: null })
    await inactiveReminderDeliveryRepository(db).markExhausted(row.id, 3, 'rebotó')
    expect(calls[1]).toEqual(['update', { status: 'failed', claimed_at: null, attempts: 3, last_error: 'rebotó' }])
  })

  it('liberar devuelve el reclamado a la cola sin gastar un intento', async () => {
    const { db, calls } = createFakeDb({ error: null })
    await inactiveReminderDeliveryRepository(db).releaseToPending(row.id)
    expect(calls[1]).toEqual(['update', { status: 'pending', claimed_at: null }])
  })

  it('un error al marcar es un fallo del repositorio', async () => {
    const { db } = createFakeDb({ error: { message: 'boom' } })
    expect(isErr(await inactiveReminderDeliveryRepository(db).markSent(row.id, 'email', NOW))).toBe(true)
  })
})
