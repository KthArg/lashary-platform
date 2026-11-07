import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isClientNoticesStorageFailed } from '../../domain/errors'
import { clientNoticeRepository, CLIENT_NOTICE_COLUMNS, CLIENT_NOTICES_TABLE } from '../client-notice-repository'

const row = {
  id: 'aviso-1',
  kind: 'reschedule_rejected',
  appointment_id: 'cita-1',
  service_name: 'Lifting de pestañas',
  requested_starts_at: '2047-10-14T15:00:00+00:00',
  kept_starts_at: '2047-10-07T15:00:00+00:00',
  created_at: '2047-10-01T18:00:00+00:00',
}

type FakeResponse = { data?: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'gt', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('clientNoticeRepository', () => {
  it('lee los avisos cuyo horario conservado todavía no pasó, los más recientes primero y con tope (PERF-002)', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const now = new Date('2047-10-02T12:00:00Z')

    const result = await clientNoticeRepository(db).listKeptFrom(now, 5)

    expect(calls).toEqual([
      ['from', CLIENT_NOTICES_TABLE],
      ['select', CLIENT_NOTICE_COLUMNS],
      ['gt', 'kept_starts_at', now.toISOString()],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['limit', 5],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'aviso-1',
        kind: 'reschedule_rejected',
        appointmentId: 'cita-1',
        serviceName: 'Lifting de pestañas',
        requestedStartsAt: new Date('2047-10-14T15:00:00Z'),
        keptStartsAt: new Date('2047-10-07T15:00:00Z'),
        createdAt: new Date('2047-10-01T18:00:00Z'),
      },
    ])
  })

  it('un fallo de la base es un error, nunca una lista vacía, y no guarda el texto crudo de la base', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'sin conexión a 10.0.0.5' } })
    const result = await clientNoticeRepository(db).listKeptFrom(new Date(), 5)
    expect(isErr(result) && isClientNoticesStorageFailed(result.error)).toBe(true)
    expect(isErr(result) && JSON.stringify(result.error)).not.toContain('10.0.0.5')
  })

  it('una fila con otra forma es un error, no un aviso a medias', async () => {
    const { db } = createFakeDb({ data: [{ ...row, kind: 'otro' }], error: null })
    const result = await clientNoticeRepository(db).listKeptFrom(new Date(), 5)
    expect(isErr(result) && isClientNoticesStorageFailed(result.error)).toBe(true)
  })
})
