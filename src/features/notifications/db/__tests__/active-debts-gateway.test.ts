import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { activeDebtsGateway, DELINQUENCY_LIST_ACTIVE_CASES_FUNCTION, LIST_ACTIVE_CASES_PAGE_SIZE } from '../active-debts-gateway'

type FakeResponse = { data: unknown; error: { message: string } | null }

const idFor = (prefix: number, index: number): string => `${String(prefix).padStart(8, '0')}-0000-4000-8000-${String(index).padStart(12, '0')}`
const clientIdFor = (index: number): string => idFor(1, index)
const caseIdFor = (index: number): string => idFor(2, index)
const SINCE = '2026-11-10T12:00:00+00:00'

type CaseRow = { clientIndex: number; caseIndex: number; pending: number }

function createFakeDb(responses: FakeResponse[]) {
  const calls: unknown[][] = []
  let nextResponse = 0
  const db = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args])
      return responses[nextResponse++]
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

const rowsOf = (cases: CaseRow[]) =>
  cases.map(({ clientIndex, caseIndex, pending }) => ({
    case_id: caseIdFor(caseIndex),
    client_id: clientIdFor(clientIndex),
    appointment_id: idFor(3, caseIndex),
    pending,
    exception_amount: null,
    since: SINCE,
  }))

const fullPage = (): CaseRow[] =>
  Array.from({ length: LIST_ACTIVE_CASES_PAGE_SIZE }, (_, index) => ({ clientIndex: index + 1, caseIndex: index + 1, pending: 1000 }))

describe('activeDebtsGateway', () => {
  it('pide los casos activos por la función del contrato de delinquency y devuelve lo que debe cada clienta', async () => {
    const { db, calls } = createFakeDb([{ data: rowsOf([{ clientIndex: 1, caseIndex: 1, pending: 18000 }]), error: null }])

    const result = await activeDebtsGateway(db).listOwedByClient()

    expect(calls).toEqual([[DELINQUENCY_LIST_ACTIVE_CASES_FUNCTION, { p_limit: LIST_ACTIVE_CASES_PAGE_SIZE, p_after_since: null, p_after_case_id: null }]])
    expect(isOk(result) && [...result.value]).toEqual([[clientIdFor(1), 18000]])
  })

  it('suma los saldos vivos de los varios casos de una misma clienta', async () => {
    const { db } = createFakeDb([
      {
        data: rowsOf([
          { clientIndex: 1, caseIndex: 1, pending: 12000 },
          { clientIndex: 1, caseIndex: 2, pending: 8000 },
          { clientIndex: 2, caseIndex: 3, pending: 5000 },
        ]),
        error: null,
      },
    ])

    const result = await activeDebtsGateway(db).listOwedByClient()

    expect(isOk(result) && result.value.get(clientIdFor(1))).toBe(20000)
    expect(isOk(result) && result.value.get(clientIdFor(2))).toBe(5000)
  })

  it('un caso activo ya sin saldo no cuenta, y una clienta sin saldo no aparece (criterio 3)', async () => {
    const { db } = createFakeDb([
      {
        data: rowsOf([
          { clientIndex: 1, caseIndex: 1, pending: 0 },
          { clientIndex: 2, caseIndex: 2, pending: 7000 },
          { clientIndex: 2, caseIndex: 3, pending: 0 },
        ]),
        error: null,
      },
    ])

    const result = await activeDebtsGateway(db).listOwedByClient()

    expect(isOk(result) && [...result.value]).toEqual([[clientIdFor(2), 7000]])
  })

  it('una página llena pide la siguiente desde el último caso de la anterior, hasta una página incompleta', async () => {
    const { db, calls } = createFakeDb([
      { data: rowsOf(fullPage()), error: null },
      { data: rowsOf([{ clientIndex: LIST_ACTIVE_CASES_PAGE_SIZE + 1, caseIndex: LIST_ACTIVE_CASES_PAGE_SIZE + 1, pending: 500 }]), error: null },
    ])

    const result = await activeDebtsGateway(db).listOwedByClient()

    expect(calls).toHaveLength(2)
    expect(calls[1]).toEqual([
      DELINQUENCY_LIST_ACTIVE_CASES_FUNCTION,
      { p_limit: LIST_ACTIVE_CASES_PAGE_SIZE, p_after_since: SINCE, p_after_case_id: caseIdFor(LIST_ACTIVE_CASES_PAGE_SIZE) },
    ])
    expect(isOk(result) && result.value.size).toBe(LIST_ACTIVE_CASES_PAGE_SIZE + 1)
  })

  it('sin casos activos devuelve un mapa vacío', async () => {
    const { db } = createFakeDb([{ data: [], error: null }])

    const result = await activeDebtsGateway(db).listOwedByClient()

    expect(isOk(result) && result.value.size).toBe(0)
  })

  it('un error de la base o una fila inesperada son un fallo, no un mapa a medias', async () => {
    const failed = await activeDebtsGateway(createFakeDb([{ data: null, error: { message: 'boom' } }]).db).listOwedByClient()
    const malformed = await activeDebtsGateway(
      createFakeDb([{ data: [{ case_id: 'no-es-uuid', client_id: clientIdFor(1), pending: 1, since: SINCE }], error: null }]).db,
    ).listOwedByClient()

    expect(isErr(failed)).toBe(true)
    expect(isErr(malformed)).toBe(true)
  })
})
