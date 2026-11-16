import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentClosingRepository } from '../appointment-closing-repository'
import { CLOSE_APPOINTMENT_FUNCTION, CLOSE_ERROR_MESSAGES } from '../appointment-closing-repository.constants'

const APPOINTMENT_ID = 'appointment-1'
const DELIVERED_TECHNIQUE_ID = 'technique-delivered'
const AFTERCARE_NOTE = 'Evitar agua 24 horas'

const closedRow = {
  appointment_id: APPOINTMENT_ID,
  outcome: 'completed',
  charge_amount: 35000,
  deposit_credit: 10000,
  amount_due: 25000,
  forfeited_deposit: 0,
  aftercare_recorded: true,
}

function fakeDb(response: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => response)
  return { db: { rpc } as unknown as SupabaseClient, rpc }
}

describe('createSupabaseAppointmentClosingRepository', () => {
  it('llama a la función de cierre con la cita, el resultado y el servicio prestado', async () => {
    const { db, rpc } = fakeDb({ data: [closedRow], error: null })

    await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
      deliveredTechniqueId: DELIVERED_TECHNIQUE_ID,
    })

    expect(rpc).toHaveBeenCalledWith(CLOSE_APPOINTMENT_FUNCTION, {
      p_appointment_id: APPOINTMENT_ID,
      p_outcome: 'completed',
      p_delivered_technique_id: DELIVERED_TECHNIQUE_ID,
      p_aftercare_note: null,
    })
  })

  it('sin servicio prestado manda null para que la base use el reservado', async () => {
    const { db, rpc } = fakeDb({ data: [closedRow], error: null })

    await createSupabaseAppointmentClosingRepository(db).close({ appointmentId: APPOINTMENT_ID, outcome: 'no_show' })

    expect(rpc).toHaveBeenCalledWith(CLOSE_APPOINTMENT_FUNCTION, {
      p_appointment_id: APPOINTMENT_ID,
      p_outcome: 'no_show',
      p_delivered_technique_id: null,
      p_aftercare_note: null,
    })
  })

  it('manda la nota de indicaciones cuando la hay', async () => {
    const { db, rpc } = fakeDb({ data: [closedRow], error: null })

    await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
      aftercareNote: AFTERCARE_NOTE,
    })

    expect(rpc).toHaveBeenCalledWith(
      CLOSE_APPOINTMENT_FUNCTION,
      expect.objectContaining({ p_aftercare_note: AFTERCARE_NOTE }),
    )
  })

  it.each([true, false])('lee aftercare_recorded = %s del resultado del cierre', async (recorded) => {
    const { db } = fakeDb({ data: [{ ...closedRow, aftercare_recorded: recorded }], error: null })

    const result = await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
    })

    expect(isOk(result) && result.value.aftercareRecorded).toBe(recorded)
  })

  it('devuelve los montos del cierre como números', async () => {
    const { db } = fakeDb({ data: [{ ...closedRow, charge_amount: '35000', amount_due: '25000' }], error: null })

    const result = await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
    })

    expect(isOk(result) && result.value).toEqual({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
      chargeAmount: 35000,
      depositCredit: 10000,
      amountDue: 25000,
      forfeitedDeposit: 0,
      aftercareRecorded: true,
    })
  })

  it.each([
    [CLOSE_ERROR_MESSAGES.notClosable, 'SCHEDULING_APPOINTMENT_NOT_CLOSABLE'],
    [CLOSE_ERROR_MESSAGES.notChargeable, 'SCHEDULING_APPOINTMENT_NOT_CHARGEABLE'],
    [CLOSE_ERROR_MESSAGES.techniqueNotAvailable, 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE'],
    [CLOSE_ERROR_MESSAGES.noteNotAllowed, 'SCHEDULING_CLOSE_NOTE_NOT_ALLOWED'],
    ['connection reset', 'SCHEDULING_STORAGE_FAILED'],
  ])('traduce el error "%s" a %s sin lanzar', async (message, code) => {
    const { db } = fakeDb({ data: null, error: { message } })

    const result = await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
    })

    expect(isErr(result) && result.error.code).toBe(code)
  })

  it('si la base no devuelve fila, es una falla de almacenamiento', async () => {
    const { db } = fakeDb({ data: [], error: null })

    const result = await createSupabaseAppointmentClosingRepository(db).close({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
    })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
