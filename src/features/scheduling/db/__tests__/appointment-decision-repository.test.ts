import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentDecisionRepository } from '../appointment-decision-repository'
import { DECIDE_APPOINTMENT_FUNCTION } from '../appointment-repository.constants'
import { APPOINTMENT_DECISION } from '../../domain/appointment-decision.constants'

const APPOINTMENT_ID = 'cita-1'
const REJECTION_REASON = 'horario no disponible'

type FakeResponse = {
  data: Array<{ id: string; status: string }> | null
  error: { message: string } | null
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
        },
      },
    ])
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

  it('un error de la base se lanza, no se disfraza de resultado de negocio', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'conexión perdida' } })

    await expect(
      createSupabaseAppointmentDecisionRepository(db).decide({
        appointmentId: APPOINTMENT_ID,
        decision: APPOINTMENT_DECISION.APPROVED,
        reason: null,
      }),
    ).rejects.toThrow('conexión perdida')
  })
})
