import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { AFTERCARE_NOTE_MAX_LENGTH } from '../../domain/aftercare-message'
import { aftercareDeliveryRepository, CLAIM_AFTERCARE_MESSAGES_FUNCTION, AFTERCARE_MESSAGES_TABLE } from '../aftercare-delivery-repository'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES } from '../claim-limits'

const NOW = fixedDate('2047-10-01T12:00:00Z')

const row = {
  id: 'indicacion-1',
  appointment_id: 'cita-1',
  client_id: 'clienta-1',
  service_name: 'Lifting de pestañas',
  aftercare_text: 'No mojes las pestañas durante 24 horas.',
  client_note: 'Evita el maquillaje en los ojos.',
  attempts: 2,
  created_at: '2047-10-01T11:00:00+00:00',
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

describe('aftercareDeliveryRepository', () => {
  it('reclama con la hora del reloj, de a tandas y con plazo, y arma cada mensaje', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await aftercareDeliveryRepository(db).claimDue(NOW)

    expect(calls).toEqual([
      ['rpc', CLAIM_AFTERCARE_MESSAGES_FUNCTION, {
        p_now: NOW.toISOString(),
        p_batch_size: CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLAIM_TTL_MINUTES,
      }],
    ])
    expect(isOk(result) && result.value).toEqual([{
      id: row.id,
      appointmentId: row.appointment_id,
      clientId: row.client_id,
      serviceName: row.service_name,
      aftercareText: row.aftercare_text,
      clientNote: row.client_note,
      attempts: row.attempts,
      createdAt: fixedDate('2047-10-01T11:00:00Z'),
    }])
  })

  it('una indicación sin nota llega con la nota en null', async () => {
    const { db } = createFakeDb({ data: [{ ...row, client_note: null }], error: null })
    const result = await aftercareDeliveryRepository(db).claimDue(NOW)
    expect(isOk(result) && result.value[0].clientNote).toBeNull()
  })

  it('marcar el envío solo toca un mensaje reclamado', async () => {
    const { db, calls } = createFakeDb({ error: null })
    const sentAt = fixedDate('2047-10-01T12:01:00Z')

    await aftercareDeliveryRepository(db).markSent(row.id, 'email', sentAt)

    expect(calls).toEqual([
      ['from', AFTERCARE_MESSAGES_TABLE],
      ['update', { status: 'sent', last_channel: 'email', sent_at: sentAt.toISOString() }],
      ['eq', 'id', row.id],
      ['eq', 'status', 'claimed'],
    ])
  })

  it('soltar un mensaje reclamado lo devuelve a pendiente y limpia el reclamo', async () => {
    const { db, calls } = createFakeDb({ error: null })

    await aftercareDeliveryRepository(db).releaseToPending(row.id)

    expect(calls).toEqual([
      ['from', AFTERCARE_MESSAGES_TABLE],
      ['update', { status: 'pending', claimed_at: null }],
      ['eq', 'id', row.id],
      ['eq', 'status', 'claimed'],
    ])
  })

  it('una fila con otra forma es un error, nunca un envío a medias', async () => {
    const { db } = createFakeDb({ data: [{ ...row, attempts: 'dos' }], error: null })
    expect(isErr(await aftercareDeliveryRepository(db).claimDue(NOW))).toBe(true)
  })

  it('una nota más larga que el tope es un error', async () => {
    const { db } = createFakeDb({ data: [{ ...row, client_note: 'a'.repeat(AFTERCARE_NOTE_MAX_LENGTH + 1) }], error: null })
    expect(isErr(await aftercareDeliveryRepository(db).claimDue(NOW))).toBe(true)
  })

  it('un fallo de la base es un error, nunca una lista vacía', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'sin conexión' } })
    expect(isErr(await aftercareDeliveryRepository(db).claimDue(NOW))).toBe(true)
    expect(isErr(await aftercareDeliveryRepository(db).markRetry(row.id, 1, 'x'))).toBe(true)
  })
})
