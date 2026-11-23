import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { clientOwedAmountGateway, DELINQUENCY_BOOKING_BLOCK_FUNCTION } from '../client-owed-amount-gateway'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args])
      return response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('clientOwedAmountGateway', () => {
  it('suma el saldo de hoy de las morosidades activas que todavía deben, por la función del contrato de delinquency', async () => {
    const { db, calls } = createFakeDb({
      data: [
        { appointment_id: 'cita-1', pending: 18000, since: '2026-11-01T00:00:00+00:00' },
        { appointment_id: 'cita-2', pending: 7000, since: '2026-11-05T00:00:00+00:00' },
      ],
      error: null,
    })

    const result = await clientOwedAmountGateway(db).owedBy(ANA)

    expect(calls).toEqual([[DELINQUENCY_BOOKING_BLOCK_FUNCTION, { p_client_id: ANA }]])
    expect(isOk(result) && result.value).toBe(25000)
  })

  it('sin filas, la morosidad ya se saldó: no debe nada (criterio 3)', async () => {
    const { db } = createFakeDb({ data: [], error: null })

    const result = await clientOwedAmountGateway(db).owedBy(ANA)

    expect(isOk(result) && result.value).toBe(0)
  })

  it('un error de la base o una fila inesperada son un fallo, no un cero', async () => {
    const failed = await clientOwedAmountGateway(createFakeDb({ data: null, error: { message: 'boom' } }).db).owedBy(ANA)
    const malformed = await clientOwedAmountGateway(createFakeDb({ data: [{ pending: 'mucho' }], error: null }).db).owedBy(ANA)

    expect(isErr(failed)).toBe(true)
    expect(isErr(malformed)).toBe(true)
  })
})
