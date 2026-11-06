import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  clientNoticeDeliveryRepository,
  CLAIM_CLIENT_NOTICES_FUNCTION,
  CLIENT_NOTICE_CLAIM_BATCH_SIZE,
  CLIENT_NOTICE_CLAIM_TTL_MINUTES,
} from '../client-notice-delivery-repository'
import { CLIENT_NOTICES_TABLE } from '../client-notice-repository'

const row = {
  id: 'aviso-1',
  kind: 'reschedule_expired',
  client_id: 'clienta-1',
  service_name: 'Lifting de pestañas',
  requested_starts_at: '2047-10-14T15:00:00+00:00',
  kept_starts_at: '2047-10-07T15:00:00+00:00',
  attempts: 2,
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

describe('clientNoticeDeliveryRepository', () => {
  it('reclama con la hora del reloj, de a tandas y con plazo, y arma cada envío', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const now = fixedDate('2047-10-01T12:00:00Z')

    const result = await clientNoticeDeliveryRepository(db).claimDue(now)

    expect(calls).toEqual([
      ['rpc', CLAIM_CLIENT_NOTICES_FUNCTION, {
        p_now: now.toISOString(),
        p_batch_size: CLIENT_NOTICE_CLAIM_BATCH_SIZE,
        p_claim_ttl_minutes: CLIENT_NOTICE_CLAIM_TTL_MINUTES,
      }],
    ])
    expect(CLIENT_NOTICE_CLAIM_BATCH_SIZE).toBeGreaterThan(0)
    expect(isOk(result) && result.value).toEqual([{
      id: 'aviso-1',
      kind: 'reschedule_expired',
      clientId: 'clienta-1',
      serviceName: 'Lifting de pestañas',
      requestedStartsAt: fixedDate('2047-10-14T15:00:00Z'),
      keptStartsAt: fixedDate('2047-10-07T15:00:00Z'),
      attempts: 2,
    }])
  })

  it('marcar el envío solo toca un aviso reclamado', async () => {
    const { db, calls } = createFakeDb({ error: null })
    const sentAt = fixedDate('2047-10-01T12:01:00Z')

    await clientNoticeDeliveryRepository(db).markSent('aviso-1', 'email', sentAt)

    expect(calls).toEqual([
      ['from', CLIENT_NOTICES_TABLE],
      ['update', { status: 'sent', last_channel: 'email', sent_at: sentAt.toISOString() }],
      ['eq', 'id', 'aviso-1'],
      ['eq', 'status', 'claimed'],
    ])
  })

  it('un fallo de la base es un error, nunca una lista vacía', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'sin conexión' } })
    expect(isErr(await clientNoticeDeliveryRepository(db).claimDue(fixedDate('2047-10-01T12:00:00Z')))).toBe(true)
    expect(isErr(await clientNoticeDeliveryRepository(db).markRetry('aviso-1', 1, 'x'))).toBe(true)
  })
})
