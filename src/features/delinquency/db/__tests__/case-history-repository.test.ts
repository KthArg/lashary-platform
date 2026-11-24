import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { HISTORY_DEFAULT_PAGE_SIZE, HISTORY_FILTERS, type HistoryFilter } from '../../domain/case-history'
import { CASES_TABLE } from '../case-list-repository'
import { REGULARIZATIONS_TABLE } from '../regularization-queue-repository'
import {
  caseHistoryRepository,
  HISTORY_COLUMNS,
  PENDING_REQUEST_STATE,
  RANGE_NOT_SATISFIABLE,
} from '../case-history-repository'

type Response = { data: unknown; error: { message: string; code?: string } | null; count: number | null }

function createFakeDb(...responses: Response[]) {
  const calls: unknown[][] = []
  let answered = 0
  const query: Record<string, unknown> = {
    then: (resolve: (value: Response) => unknown) => resolve(responses[Math.min(answered++, responses.length - 1)]),
  }
  for (const method of ['select', 'eq', 'is', 'order', 'range']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (name: string) => (calls.push(['from', name]), query) } as unknown as SupabaseClient
  return { db, calls }
}

const row = {
  id: '00000000-0000-4000-8000-0000000017d1',
  client_id: '00000000-0000-4000-8000-0000000017c1',
  appointment_id: '00000000-0000-4000-8000-0000000017e1',
  pending: 20000,
  state: 'active',
  detected_at: '2026-11-10T15:00:00Z',
  delinquency_regularizations: [],
}
const PENDING_REQUEST = { id: '00000000-0000-4000-8000-0000000017f1' }
const FIRST_PAGE = { filter: 'all', page: 0, pageSize: HISTORY_DEFAULT_PAGE_SIZE } as const

async function listWith(filter: HistoryFilter, page = 0) {
  const { db, calls } = createFakeDb({ data: [], error: null, count: 0 })
  await caseHistoryRepository(db).list({ filter, page, pageSize: HISTORY_DEFAULT_PAGE_SIZE })
  return calls
}

const embeddedSelect = (mode: string) => [
  'select',
  `${HISTORY_COLUMNS}, ${REGULARIZATIONS_TABLE}${mode}(id)`,
  { count: 'exact' },
]

describe('caseHistoryRepository.list', () => {
  it('lee de la más reciente a la más antigua con desempate por id y pide el rango de la página', async () => {
    const calls = await listWith('all', 2)

    expect(calls[0]).toEqual(['from', CASES_TABLE])
    expect(calls).toContainEqual(embeddedSelect(''))
    expect(calls).toContainEqual(['eq', `${REGULARIZATIONS_TABLE}.state`, PENDING_REQUEST_STATE])
    expect(calls).toContainEqual(['order', 'detected_at', { ascending: false }])
    expect(calls).toContainEqual(['order', 'id', { ascending: false }])
    const firstIndex = 2 * HISTORY_DEFAULT_PAGE_SIZE
    expect(calls).toContainEqual(['range', firstIndex, firstIndex + HISTORY_DEFAULT_PAGE_SIZE - 1])
  })

  it('todas no filtra por estado', async () => {
    const calls = await listWith('all')

    expect(calls.some((call) => call[0] === 'eq' && call[1] === 'state')).toBe(false)
  })

  it('pendiente de aprobación pide las activas con la solicitud pendiente en un embebido obligatorio', async () => {
    const calls = await listWith('pending_approval')

    expect(calls).toContainEqual(embeddedSelect('!inner'))
    expect(calls).toContainEqual(['eq', 'state', 'active'])
  })

  it('activa pide las activas sin ninguna solicitud pendiente con el anti-join', async () => {
    const calls = await listWith('active')

    expect(calls).toContainEqual(embeddedSelect('!left'))
    expect(calls).toContainEqual(['eq', 'state', 'active'])
    expect(calls).toContainEqual(['is', REGULARIZATIONS_TABLE, null])
  })

  it('cada uno de los demás filtros pide su estado', async () => {
    const stateFilters = HISTORY_FILTERS.filter((filter) => !['all', 'active', 'pending_approval'].includes(filter))

    for (const filter of stateFilters) {
      expect(await listWith(filter)).toContainEqual(['eq', 'state', filter])
    }
  })

  it('mapea las filas, marca la solicitud pendiente y trae el total', async () => {
    const { db } = createFakeDb({
      data: [row, { ...row, id: '00000000-0000-4000-8000-0000000017d2', delinquency_regularizations: [PENDING_REQUEST] }],
      error: null,
      count: 61,
    })
    const result = await caseHistoryRepository(db).list(FIRST_PAGE)

    expect(isOk(result) && result.value.total).toBe(61)
    expect(isOk(result) && result.value.rows).toEqual([
      {
        caseId: row.id,
        clientId: row.client_id,
        appointmentId: row.appointment_id,
        pending: 20000,
        state: 'active',
        detectedAt: new Date('2026-11-10T15:00:00Z'),
        hasPendingRequest: false,
      },
      expect.objectContaining({ caseId: '00000000-0000-4000-8000-0000000017d2', hasPendingRequest: true }),
    ])
  })

  it('un error de la base es un fallo de almacenamiento', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'caída' }, count: null })
    const result = await caseHistoryRepository(db).list(FIRST_PAGE)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })

  it('una página más allá del total devuelve una página vacía con el total, no un error', async () => {
    const beyondTotal = { data: null, error: { message: 'rango', code: RANGE_NOT_SATISFIABLE }, count: null }
    const { db, calls } = createFakeDb(beyondTotal, { data: null, error: null, count: 7 })
    const result = await caseHistoryRepository(db).list({ ...FIRST_PAGE, page: 10 })

    expect(isOk(result) && result.value).toEqual({ rows: [], total: 7 })
    expect(calls).toContainEqual([
      'select',
      `${HISTORY_COLUMNS}, ${REGULARIZATIONS_TABLE}(id)`,
      { count: 'exact', head: true },
    ])
  })

  it('una fila con forma inesperada o sin total es un fallo, no un listado inventado', async () => {
    const badRow = createFakeDb({ data: [{ ...row, state: 'inventado' }], error: null, count: 1 })
    const noTotal = createFakeDb({ data: [row], error: null, count: null })

    expect(isErr(await caseHistoryRepository(badRow.db).list(FIRST_PAGE))).toBe(true)
    expect(isErr(await caseHistoryRepository(noTotal.db).list(FIRST_PAGE))).toBe(true)
  })
})
