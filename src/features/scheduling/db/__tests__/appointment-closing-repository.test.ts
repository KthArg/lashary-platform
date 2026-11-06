import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAppointmentClosingRepository } from '../appointment-closing-repository'
import { CLOSE_APPOINTMENT_FUNCTION, CLOSE_ERROR_MESSAGES } from '../appointment-closing-repository.constants'

const APPOINTMENT_ID = 'appointment-1'
const DELIVERED_TECHNIQUE_ID = 'technique-delivered'

const closedRow = {
  appointment_id: APPOINTMENT_ID,
  outcome: 'completed',
  charge_amount: 35000,
  deposit_credit: 10000,
  amount_due: 25000,
  forfeited_deposit: 0,
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
    })
  })

  it('sin servicio prestado manda null para que la base use el reservado', async () => {
    const { db, rpc } = fakeDb({ data: [closedRow], error: null })

    await createSupabaseAppointmentClosingRepository(db).close({ appointmentId: APPOINTMENT_ID, outcome: 'no_show' })

    expect(rpc).toHaveBeenCalledWith(CLOSE_APPOINTMENT_FUNCTION, {
      p_appointment_id: APPOINTMENT_ID,
      p_outcome: 'no_show',
      p_delivered_technique_id: null,
    })
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
    })
  })

  it.each([
    [CLOSE_ERROR_MESSAGES.notClosable, 'SCHEDULING_APPOINTMENT_NOT_CLOSABLE'],
    [CLOSE_ERROR_MESSAGES.notChargeable, 'SCHEDULING_APPOINTMENT_NOT_CHARGEABLE'],
    [CLOSE_ERROR_MESSAGES.techniqueNotAvailable, 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE'],
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
