import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildLedgerRange } from '../../domain/ledger-export-range'
import { isLedgerExportTooLarge } from '../../domain/errors'
import {
  createSupabaseLedgerExportRepository,
  LEDGER_EXPORT_MAX_ENTRIES,
  LEDGER_EXPORT_PAGE_SIZE,
  LEDGER_TABLE,
} from '../ledger-export-repository'
import { CLIENT_NAMES_CHUNK_SIZE, CLIENT_NAMES_FUNCTION } from '../ledger-client-names'

type Answer = { data: unknown; error: { message: string } | null }

const ledgerRow = (index: number) => ({
  client_id: `cliente-${index % 250}`,
  appointment_id: null,
  kind: 'charge',
  amount: 1000,
  created_at: '2026-11-10T15:00:00Z',
})

const pageOf = (size: number, offset = 0) => Array.from({ length: size }, (_, index) => ledgerRow(offset + index))

function createFakeDb(pages: Answer[], names: Answer = { data: [], error: null }) {
  const calls: unknown[][] = []
  const rpcCalls: { chunk: string[] }[] = []
  let page = 0
  const query: Record<string, unknown> = {
    then: (resolve: (value: Answer) => unknown) => resolve(pages[Math.min(page++, pages.length - 1)]),
  }
  for (const method of ['select', 'gte', 'lt', 'order', 'range']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: (name: string, args: { p_client_ids: string[] }) => {
      calls.push(['rpc', name])
      rpcCalls.push({ chunk: args.p_client_ids })
      return Promise.resolve(names)
    },
  } as unknown as SupabaseClient
  return { db, calls, rpcCalls }
}

const range = (() => {
  const built = buildLedgerRange('2026-11-01', '2026-11-30')
  if (!built.ok) throw new Error('rango de prueba inválido')
  return built.value
})()

describe('createSupabaseLedgerExportRepository', () => {
  it('lee por páginas de mil, en orden de fecha e id, hasta una página corta', async () => {
    const { db, calls } = createFakeDb([
      { data: pageOf(LEDGER_EXPORT_PAGE_SIZE), error: null },
      { data: pageOf(5), error: null },
    ])

    const result = await createSupabaseLedgerExportRepository(db).entriesIn(range)

    expect(result.ok && result.value).toHaveLength(LEDGER_EXPORT_PAGE_SIZE + 5)
    expect(calls).toContainEqual(['from', LEDGER_TABLE])
    expect(calls).toContainEqual(['gte', 'created_at', range.startsAt.toISOString()])
    expect(calls).toContainEqual(['lt', 'created_at', range.endsBefore.toISOString()])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: true }])
    expect(calls).toContainEqual(['order', 'id', { ascending: true }])
    expect(calls).toContainEqual(['range', 0, LEDGER_EXPORT_PAGE_SIZE - 1])
    expect(calls).toContainEqual(['range', LEDGER_EXPORT_PAGE_SIZE, 2 * LEDGER_EXPORT_PAGE_SIZE - 1])
  })

  it('pide los nombres de a 200 ids sin repetir clientas y los pone en cada asiento', async () => {
    const { db, rpcCalls, calls } = createFakeDb(
      [{ data: pageOf(300), error: null }],
      { data: [{ client_id: 'cliente-0', full_name: 'Ana Solís' }], error: null },
    )

    const result = await createSupabaseLedgerExportRepository(db).entriesIn(range)

    expect(calls).toContainEqual(['rpc', CLIENT_NAMES_FUNCTION])
    expect(rpcCalls.map((call) => call.chunk.length)).toEqual([CLIENT_NAMES_CHUNK_SIZE, 50])
    expect(result.ok && result.value[0].clientName).toBe('Ana Solís')
    expect(result.ok && result.value[1].clientName).toBe('cliente-1')
  })

  it('devuelve un error tipado, no un export cortado, al pasar del tope', async () => {
    const { db } = createFakeDb([{ data: pageOf(LEDGER_EXPORT_PAGE_SIZE), error: null }])

    const result = await createSupabaseLedgerExportRepository(db).entriesIn(range)

    expect(!result.ok && isLedgerExportTooLarge(result.error)).toBe(true)
    expect(LEDGER_EXPORT_MAX_ENTRIES % LEDGER_EXPORT_PAGE_SIZE).toBe(0)
  })

  it('acepta exactamente el tope cuando la página siguiente viene vacía', async () => {
    const fullPages = Array.from({ length: LEDGER_EXPORT_MAX_ENTRIES / LEDGER_EXPORT_PAGE_SIZE }, () => ({
      data: pageOf(LEDGER_EXPORT_PAGE_SIZE),
      error: null,
    }))
    const { db } = createFakeDb([...fullPages, { data: [], error: null }])

    const result = await createSupabaseLedgerExportRepository(db).entriesIn(range)

    expect(result.ok && result.value).toHaveLength(LEDGER_EXPORT_MAX_ENTRIES)
  })

  it('devuelve el fallo de base del ledger y el de los nombres', async () => {
    const ledgerFails = createFakeDb([{ data: null, error: { message: 'caída' } }])
    const namesFail = createFakeDb([{ data: pageOf(1), error: null }], { data: null, error: { message: 'sin nombres' } })

    const first = await createSupabaseLedgerExportRepository(ledgerFails.db).entriesIn(range)
    const second = await createSupabaseLedgerExportRepository(namesFail.db).entriesIn(range)

    expect(!first.ok && first.error.message).toBe('caída')
    expect(!second.ok && second.error.message).toBe('sin nombres')
  })

  it('rechaza una fila con un tipo desconocido', async () => {
    const { db } = createFakeDb([{ data: [{ ...ledgerRow(0), kind: 'otro' }], error: null }])

    const result = await createSupabaseLedgerExportRepository(db).entriesIn(range)

    expect(result.ok).toBe(false)
  })
})
