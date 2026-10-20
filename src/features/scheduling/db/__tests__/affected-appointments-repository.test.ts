import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAffectedAppointmentsRepository } from '../affected-appointments-repository'
import {
  COUNT_APPOINTMENTS_BY_WEEKLY_BLOCK_FUNCTION,
  COUNT_APPOINTMENTS_IN_RANGE_FUNCTION,
} from '../affected-appointments-repository.constants'

const RESOURCE_ID = 'recurso-estudio'
const BLOCK_ID = 'bloque-lunes'
const FROM_MS = Date.parse('2027-09-06T06:00:00Z')
const TO_MS = Date.parse('2027-09-07T06:00:00Z')

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<{ functionName: string; args: unknown }> = []
  const db = {
    rpc: async (functionName: string, args: unknown) => {
      calls.push({ functionName, args })
      return response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseAffectedAppointmentsRepository — criterio 9', () => {
  it('cuenta las citas de un rango pasando el recurso y los instantes en UTC', async () => {
    const { db, calls } = createFakeDb({ data: 3, error: null })
    const result = await createSupabaseAffectedAppointmentsRepository(db).countInRange({
      resourceId: RESOURCE_ID,
      fromMs: FROM_MS,
      toMs: TO_MS,
    })

    expect(calls).toEqual([
      {
        functionName: COUNT_APPOINTMENTS_IN_RANGE_FUNCTION,
        args: { p_resource_id: RESOURCE_ID, p_from: '2027-09-06T06:00:00.000Z', p_to: '2027-09-07T06:00:00.000Z' },
      },
    ])
    expect(isOk(result) && result.value).toBe(3)
  })

  it('cuenta las citas que afecta quitar un bloque semanal', async () => {
    const { db, calls } = createFakeDb({ data: 0, error: null })
    const result = await createSupabaseAffectedAppointmentsRepository(db).countByWeeklyBlock(BLOCK_ID)

    expect(calls).toEqual([{ functionName: COUNT_APPOINTMENTS_BY_WEEKLY_BLOCK_FUNCTION, args: { p_block_id: BLOCK_ID } }])
    expect(isOk(result) && result.value).toBe(0)
  })

  it.each([
    ['un fallo de la base', { data: null, error: { message: 'connection refused' } }],
    ['una respuesta que no es un número', { data: null, error: null }],
  ])('%s es StorageFailed, nunca «cero citas»', async (_name, response) => {
    const { db } = createFakeDb(response)
    const result = await createSupabaseAffectedAppointmentsRepository(db).countByWeeklyBlock(BLOCK_ID)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
