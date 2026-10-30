import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { INBOX_LIMIT } from '../../domain/inbox-notice'
import { inboxRepository, INBOX_COLUMNS, INBOX_TABLE } from '../inbox-repository'

const row = {
  id: 'aviso-1',
  kind: 'booking_created',
  appointment_id: 'cita-1',
  client_name: 'Ana Pérez',
  service_name: 'Lifting de pestañas',
  starts_at: '2026-11-05T15:00:00+00:00',
  read_at: null,
  created_at: '2026-10-29T18:00:00+00:00',
}

type FakeResponse = { data?: unknown; count?: number | null; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = {
    then: (resolve: (value: FakeResponse) => unknown) => resolve(response),
  }
  for (const method of ['select', 'order', 'range', 'is', 'update', 'eq']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('inboxRepository', () => {
  it('lista una página de avisos, más recientes primero, y convierte las fechas', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await inboxRepository(db).listRecent({ offset: 0, limit: INBOX_LIMIT })

    expect(calls).toEqual([
      ['from', INBOX_TABLE],
      ['select', INBOX_COLUMNS],
      ['order', 'created_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['range', 0, INBOX_LIMIT],
    ])
    expect(isOk(result) && result.value).toEqual({
      notices: [
        {
          id: 'aviso-1',
          kind: 'booking_created',
          appointmentId: 'cita-1',
          clientName: 'Ana Pérez',
          serviceName: 'Lifting de pestañas',
          startsAt: new Date('2026-11-05T15:00:00Z'),
          readAt: null,
          createdAt: new Date('2026-10-29T18:00:00Z'),
        },
      ],
      hasMore: false,
    })
  })

  it('con más de 20 avisos devuelve 20 y avisa que hay más; la página siguiente empieza en el 21', async () => {
    const twentyOneRows = Array.from({ length: INBOX_LIMIT + 1 }, (_, index) => ({ ...row, id: `aviso-${index + 1}` }))
    const firstPage = createFakeDb({ data: twentyOneRows, error: null })
    const secondPage = createFakeDb({ data: [], error: null })

    const result = await inboxRepository(firstPage.db).listRecent({ offset: 0, limit: INBOX_LIMIT })
    await inboxRepository(secondPage.db).listRecent({ offset: INBOX_LIMIT, limit: INBOX_LIMIT })

    expect(isOk(result) && result.value.notices).toHaveLength(INBOX_LIMIT)
    expect(isOk(result) && result.value.hasMore).toBe(true)
    expect(secondPage.calls.at(-1)).toEqual(['range', INBOX_LIMIT, INBOX_LIMIT * 2])
  })

  it('un fallo de la base al listar es un error con su causa, nunca una bandeja vacía', async () => {
    const result = await inboxRepository(createFakeDb({ data: null, error: { message: 'caída' } }).db).listRecent({
      offset: 0,
      limit: INBOX_LIMIT,
    })

    expect(isErr(result) && result.error.cause).toBe('caída')
  })

  it('cuenta solo los avisos sin leer, sin traer las filas', async () => {
    const { db, calls } = createFakeDb({ count: 3, error: null })

    const result = await inboxRepository(db).countUnread()

    expect(calls).toEqual([
      ['from', INBOX_TABLE],
      ['select', 'id', { count: 'exact', head: true }],
      ['is', 'read_at', null],
    ])
    expect(isOk(result) && result.value).toBe(3)
  })

  it('marcar como leído guarda la fecha, y como no leído la borra (criterio 3)', async () => {
    const readAt = new Date('2026-10-29T19:00:00Z')
    const read = createFakeDb({ data: [{ id: 'aviso-1' }], error: null })
    const unread = createFakeDb({ data: [{ id: 'aviso-1' }], error: null })

    const readResult = await inboxRepository(read.db).setReadAt('aviso-1', readAt)
    await inboxRepository(unread.db).setReadAt('aviso-1', null)

    expect(read.calls).toEqual([
      ['from', INBOX_TABLE],
      ['update', { read_at: readAt.toISOString() }],
      ['eq', 'id', 'aviso-1'],
      ['select', 'id'],
    ])
    expect(unread.calls[1]).toEqual(['update', { read_at: null }])
    expect(isOk(readResult) && readResult.value).toEqual({ updated: true })
  })

  it('si la RLS no deja tocar el aviso, o no existe, informa que no se actualizó', async () => {
    const result = await inboxRepository(createFakeDb({ data: [], error: null }).db).setReadAt('ajeno', null)

    expect(isOk(result) && result.value).toEqual({ updated: false })
  })
})
