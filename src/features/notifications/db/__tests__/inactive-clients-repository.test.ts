import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { isInactiveQueueEmpty, isInactiveQueueNotAllowed, isInactiveQueueTooMany } from '../../domain/errors'
import {
  INACTIVE_CLIENTS_FUNCTION,
  QUEUE_INACTIVE_REMINDERS_FUNCTION,
  inactiveClientsRepository,
} from '../inactive-clients-repository'

const SINCE = fixedDate('2047-07-01T12:00:00Z')

const row = {
  client_id: '00000000-0000-0000-0000-0000000000c1',
  full_name: 'Ana Rodríguez',
  last_visit_at: '2047-03-10T16:00:00+00:00',
  opted_out: false,
  last_reminder_status: 'sent',
  last_reminder_queued_at: '2047-05-01T10:00:00+00:00',
  last_reminder_sent_at: '2047-05-01T10:05:00+00:00',
}

type FakeResponse = { data?: unknown; error: { message: string; code?: string } | null; count?: number | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['order', 'range']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    rpc: (name: string, args: unknown, options?: unknown) => (calls.push(['rpc', name, args, options]), query),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('inactiveClientsRepository.listPage', () => {
  it('pide la lista con la fecha de corte, contada y paginada en la base: primero las de visita más vieja (PERF-002)', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null, count: 7 })

    const result = await inactiveClientsRepository(db).listPage({ since: SINCE, offset: 20, limit: 20 })

    expect(calls).toEqual([
      ['rpc', INACTIVE_CLIENTS_FUNCTION, { p_since: SINCE.toISOString() }, { count: 'exact' }],
      ['order', 'last_visit_at', { ascending: true, nullsFirst: true }],
      ['order', 'full_name'],
      ['order', 'client_id'],
      ['range', 20, 39],
    ])
    expect(isOk(result) && result.value).toEqual({
      total: 7,
      clients: [{
        clientId: row.client_id,
        fullName: row.full_name,
        lastVisitAt: fixedDate('2047-03-10T16:00:00Z'),
        optedOut: false,
        lastReminder: { status: 'sent', queuedAt: fixedDate('2047-05-01T10:00:00Z'), sentAt: fixedDate('2047-05-01T10:05:00Z') },
      }],
    })
  })

  it('la que nunca vino ni recibió recordatorio llega sin visita y sin recordatorio', async () => {
    const { db } = createFakeDb({
      data: [{ ...row, last_visit_at: null, last_reminder_status: null, last_reminder_queued_at: null, last_reminder_sent_at: null }],
      error: null,
      count: 1,
    })
    const result = await inactiveClientsRepository(db).listPage({ since: SINCE, offset: 0, limit: 20 })
    expect(isOk(result) && result.value.clients[0]).toMatchObject({ lastVisitAt: null, lastReminder: null })
  })

  it.each([
    ['un error de la base', { data: null, error: { message: 'boom' }, count: null }],
    ['sin conteo', { data: [row], error: null, count: null }],
    ['un estado de recordatorio desconocido', { data: [{ ...row, last_reminder_status: 'enviado' }], error: null, count: 1 }],
    ['una fecha ilegible', { data: [{ ...row, last_visit_at: 'ayer' }], error: null, count: 1 }],
  ])('%s es un fallo del repositorio, no una lista vacía', async (_, response) => {
    const { db } = createFakeDb(response)
    expect(isErr(await inactiveClientsRepository(db).listPage({ since: SINCE, offset: 0, limit: 20 }))).toBe(true)
  })
})

describe('inactiveClientsRepository.queue', () => {
  const LIMITS = { maxClients: 50, minDaysBetween: 30 }

  it('pone en cola en una sola llamada, con los topes, y devuelve los conteos', async () => {
    const { db, calls } = createFakeDb({
      data: [{ queued: 2, already_queued: 1, opted_out: 1, recent: 0, unknown: 0 }],
      error: null,
    })

    const result = await inactiveClientsRepository(db).queue(['c1', 'c2'], LIMITS)

    expect(calls).toEqual([
      ['rpc', QUEUE_INACTIVE_REMINDERS_FUNCTION, { p_client_ids: ['c1', 'c2'], p_max_clients: 50, p_min_days_between: 30 }, undefined],
    ])
    expect(isOk(result) && result.value).toEqual({ queued: 2, alreadyQueued: 1, optedOut: 1, recent: 0, unknown: 0 })
  })

  it.each([
    ['notifications_not_admin', isInactiveQueueNotAllowed],
    ['notifications_inactive_no_clients', isInactiveQueueEmpty],
    ['notifications_inactive_too_many', isInactiveQueueTooMany],
  ])('el RAISE %s se traduce a su error tipado (DOM-006)', async (message, guard) => {
    const { db } = createFakeDb({ data: null, error: { message } })
    const result = await inactiveClientsRepository(db).queue(['c1'], LIMITS)
    expect(isErr(result) && guard(result.error)).toBe(true)
  })

  it('otro error de la base es un fallo del repositorio', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'boom' } })
    const result = await inactiveClientsRepository(db).queue(['c1'], LIMITS)
    expect(isErr(result) && result.error).toBe('repository-failed')
  })

  it('una respuesta sin la fila de conteos es un fallo del repositorio', async () => {
    const { db } = createFakeDb({ data: [], error: null })
    expect(isErr(await inactiveClientsRepository(db).queue(['c1'], LIMITS))).toBe(true)
  })
})
