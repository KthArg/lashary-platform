import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  createSupabaseAppointmentRepository,
  type OverlapRejectedEvent,
} from '../appointment-repository'
import {
  CREATE_APPOINTMENT_FUNCTION,
  EXCLUSION_VIOLATION_CODE,
  OVERLAP_REJECTED_EVENT,
} from '../appointment-repository.constants'

const RESOURCE_ID = 'recurso-estudio'
const FROM_MS = Date.parse('2027-03-01T09:45:00Z')
const UNTIL_MS = Date.parse('2027-03-01T11:10:00Z')
const newAppointment = {
  resourceId: RESOURCE_ID,
  startsAtMs: Date.parse('2027-03-01T10:00:00Z'),
  endsAtMs: Date.parse('2027-03-01T11:00:00Z'),
  occupiedFromMs: FROM_MS,
  occupiedUntilMs: UNTIL_MS,
}

type FakeResponse = {
  data: { id: string; resource_id: string } | null
  error: { code?: string; message: string } | null
}

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

describe('createSupabaseAppointmentRepository', () => {
  it('llama a la función SQL con el rango ocupado como tstzrange [) en UTC y devuelve la cita', async () => {
    const { db, calls } = createFakeDb({
      data: { id: 'cita-1', resource_id: RESOURCE_ID },
      error: null,
    })
    const result = await createSupabaseAppointmentRepository(db).create(newAppointment)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual({ id: 'cita-1', resourceId: RESOURCE_ID })
    expect(calls).toEqual([
      {
        functionName: CREATE_APPOINTMENT_FUNCTION,
        args: {
          p_resource_id: RESOURCE_ID,
          p_starts_at: '2027-03-01T10:00:00.000Z',
          p_ends_at: '2027-03-01T11:00:00.000Z',
          p_occupied_range: '[2027-03-01T09:45:00.000Z,2027-03-01T11:10:00.000Z)',
        },
      },
    ])
  })

  it('exclusion_violation → SpaceNotAvailable y un evento estructurado (criterio 5)', async () => {
    const { db } = createFakeDb({
      data: null,
      error: { code: EXCLUSION_VIOLATION_CODE, message: 'conflicting key value' },
    })
    const reported: OverlapRejectedEvent[] = []
    const result = await createSupabaseAppointmentRepository(db, (event) =>
      reported.push(event),
    ).create(newAppointment)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toMatchObject({
        code: 'SCHEDULING_SPACE_NOT_AVAILABLE',
        resourceId: RESOURCE_ID,
      })
    }
    expect(reported).toEqual([
      {
        event: OVERLAP_REJECTED_EVENT,
        resourceId: RESOURCE_ID,
        occupiedFromMs: FROM_MS,
        occupiedUntilMs: UNTIL_MS,
      },
    ])
  })

  it('cualquier otro error de la base devuelve StorageFailed y no emite el evento de solape', async () => {
    const { db } = createFakeDb({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    })
    const reported: OverlapRejectedEvent[] = []
    const repository = createSupabaseAppointmentRepository(db, (event) => reported.push(event))

    const result = await repository.create(newAppointment)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    expect(reported).toHaveLength(0)
  })
})
