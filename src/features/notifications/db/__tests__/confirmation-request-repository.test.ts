import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { confirmationRequestRepository } from '../confirmation-request-repository'

const NOW = new Date('2027-03-09T15:00:00Z')
const REQUEST_ID = 'solicitud-1'

const row = {
  id: REQUEST_ID,
  appointment_id: 'cita-1',
  client_id: 'clienta-1',
  starts_at: '2027-03-10T15:00:00Z',
  service_name: 'Clásicas',
  status: 'claimed',
  attempts: 1,
  last_channel: null,
}

const dbWithRpc = (response: { data: unknown; error: { message: string } | null }) =>
  ({ rpc: vi.fn().mockResolvedValue(response) }) as unknown as SupabaseClient

function dbWithUpdate(error: { message: string } | null = null, updatedRows: { id: string }[] = [{ id: REQUEST_ID }]) {
  const select = vi.fn().mockResolvedValue({ data: error ? null : updatedRows, error })
  const secondEq = vi.fn(() => ({ select }))
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  const update = vi.fn(() => ({ eq: firstEq }))
  return { db: { from: vi.fn(() => ({ update })) } as unknown as SupabaseClient, update, firstEq, secondEq }
}

function dbWithSelect(data: { id: string }[] | null, error: { message: string } | null = null) {
  const secondEq = vi.fn().mockResolvedValue({ data, error })
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  return { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: firstEq })) })) } as unknown as SupabaseClient
}

describe('confirmationRequestRepository', () => {
  it('reclama por la función y convierte las filas', async () => {
    const db = dbWithRpc({ data: [row], error: null })

    const result = await confirmationRequestRepository(db).claimPending(NOW)

    expect(db.rpc).toHaveBeenCalledWith(
      'notifications_claim_confirmation_requests',
      expect.objectContaining({ p_now: NOW.toISOString(), p_claim_ttl_minutes: 10 }),
    )
    expect(isOk(result) && result.value).toEqual([
      {
        id: REQUEST_ID,
        appointmentId: 'cita-1',
        clientId: 'clienta-1',
        startsAt: new Date(row.starts_at),
        serviceName: 'Clásicas',
        status: 'claimed',
        attempts: 1,
        lastChannel: null,
      },
    ])
  })

  it('un fallo al reclamar se informa', async () => {
    const result = await confirmationRequestRepository(dbWithRpc({ data: null, error: { message: 'sin red' } })).claimPending(NOW)
    expect(isErr(result)).toBe(true)
  })

  it('marcar enviado guarda el canal y solo toca lo reclamado: una solicitud cancelada sigue cancelada', async () => {
    const { db, update, firstEq, secondEq } = dbWithUpdate()

    await confirmationRequestRepository(db).markSent(REQUEST_ID, 'email', NOW)

    expect(update).toHaveBeenCalledWith({ status: 'sent', last_channel: 'email', sent_at: NOW.toISOString() })
    expect(firstEq).toHaveBeenCalledWith('id', REQUEST_ID)
    expect(secondEq).toHaveBeenCalledWith('status', 'claimed')
  })

  it('reintentar la devuelve a pendiente con los intentos y el error', async () => {
    const { db, update } = dbWithUpdate()

    await confirmationRequestRepository(db).markRetry(REQUEST_ID, 2, 'sin canal')

    expect(update).toHaveBeenCalledWith({ status: 'pending', claimed_at: null, attempts: 2, last_error: 'sin canal' })
  })

  it('agotar los intentos la deja fallida', async () => {
    const { db, update } = dbWithUpdate()

    await confirmationRequestRepository(db).markExhausted(REQUEST_ID, 5, 'sin canal')

    expect(update).toHaveBeenCalledWith({ status: 'failed', attempts: 5, last_error: 'sin canal' })
  })

  it('si la solicitud ya no estaba reclamada, no la da por actualizada', async () => {
    const { db } = dbWithUpdate(null, [])

    const result = await confirmationRequestRepository(db).markSent(REQUEST_ID, 'email', NOW)

    expect(isErr(result) && result.error).toBe('not-claimed')
  })

  it('dice si la solicitud sigue reclamada', async () => {
    const claimed = dbWithSelect([{ id: REQUEST_ID }])
    const cancelled = dbWithSelect([])

    const stillClaimed = await confirmationRequestRepository(claimed).isStillClaimed(REQUEST_ID)
    const noLongerClaimed = await confirmationRequestRepository(cancelled).isStillClaimed(REQUEST_ID)

    expect(isOk(stillClaimed) && stillClaimed.value).toBe(true)
    expect(isOk(noLongerClaimed) && noLongerClaimed.value).toBe(false)
  })

  it('un fallo al comprobar si sigue reclamada se informa', async () => {
    const result = await confirmationRequestRepository(dbWithSelect(null, { message: 'sin red' })).isStillClaimed(REQUEST_ID)
    expect(isErr(result)).toBe(true)
  })

  it('un fallo al actualizar se informa', async () => {
    const { db } = dbWithUpdate({ message: 'sin red' })
    expect(isErr(await confirmationRequestRepository(db).releaseToPending(REQUEST_ID))).toBe(true)
  })
})
