import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentDecisionRepository } from '../appointment-decision-repository'
import { DECIDE_APPOINTMENT_FUNCTION, SCHEDULE_CHANGED_MESSAGE } from '../appointment-repository.constants'
import { APPOINTMENT_DECISION } from '../../domain/appointment-decision.constants'

const APPOINTMENT_ID = 'cita-1'
const REJECTION_REASON = 'horario no disponible'
const SEEN_STARTS_AT = '2027-09-06T15:00:00.000Z'
const CURRENT_STARTS_AT_MS = Date.parse('2027-09-07T15:00:00Z')
const CURRENT_ENDS_AT_MS = Date.parse('2027-09-07T16:00:00Z')

type FakeResponse = {
  data: Array<{ id: string; status: string }> | null
  error: { message: string; details?: string } | null
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

describe('createSupabaseAppointmentDecisionRepository', () => {
  it('llama a la función SQL con la decisión y el motivo, sin enviar quién decide', async () => {
    const { db, calls } = createFakeDb({
      data: [{ id: APPOINTMENT_ID, status: APPOINTMENT_DECISION.REJECTED }],
      error: null,
    })

    const result = await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.REJECTED,
      reason: REJECTION_REASON,
    })

    expect(isOk(result)).toBe(true)
    expect(calls).toEqual([
      {
        functionName: DECIDE_APPOINTMENT_FUNCTION,
        args: {
          p_appointment_id: APPOINTMENT_ID,
          p_decision: APPOINTMENT_DECISION.REJECTED,
          p_reason: REJECTION_REASON,
          p_expected_starts_at: null,
        },
      },
    ])
  })

  it('al aprobar manda el horario que vio la administradora', async () => {
    const { db, calls } = createFakeDb({
      data: [{ id: APPOINTMENT_ID, status: APPOINTMENT_DECISION.APPROVED }],
      error: null,
    })

    await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.APPROVED,
      reason: null,
      expectedStartsAtMs: Date.parse(SEEN_STARTS_AT),
    })

    expect(calls[0].args).toMatchObject({ p_expected_starts_at: SEEN_STARTS_AT })
  })

  it('si el horario cambió, devuelve el error con el inicio y el fin vigentes que trae la base', async () => {
    const { db } = createFakeDb({
      data: null,
      error: { message: SCHEDULE_CHANGED_MESSAGE, details: `${CURRENT_STARTS_AT_MS}|${CURRENT_ENDS_AT_MS}` },
    })

    const result = await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.APPROVED,
      reason: null,
      expectedStartsAtMs: Date.parse(SEEN_STARTS_AT),
    })

    expect(isErr(result) && result.error).toMatchObject({
      code: 'SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED',
      appointmentId: APPOINTMENT_ID,
      startsAtMs: CURRENT_STARTS_AT_MS,
      endsAtMs: CURRENT_ENDS_AT_MS,
    })
  })

  it('si la base avisa del cambio pero sin el horario, es un fallo de almacenamiento y no un horario inventado', async () => {
    const { db } = createFakeDb({ data: null, error: { message: SCHEDULE_CHANGED_MESSAGE } })

    const result = await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.APPROVED,
      reason: null,
      expectedStartsAtMs: Date.parse(SEEN_STARTS_AT),
    })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })

  it('sin fila devuelve AppointmentNotPending como valor', async () => {
    const { db } = createFakeDb({ data: [], error: null })

    const result = await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.APPROVED,
      reason: null,
    })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_PENDING')
  })

  it('un error de la base devuelve StorageFailed, no AppointmentNotPending', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'conexión perdida' } })

    const result = await createSupabaseAppointmentDecisionRepository(db).decide({
      appointmentId: APPOINTMENT_ID,
      decision: APPOINTMENT_DECISION.APPROVED,
      reason: null,
    })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
