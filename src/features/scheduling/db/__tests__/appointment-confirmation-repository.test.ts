import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isAppointmentNotConfirmable } from '../../domain/errors'
import {
  createSupabaseAppointmentConfirmationRepository,
  createSupabaseConfirmationPolicyRepository,
} from '../appointment-confirmation-repository'

const APPOINTMENT_ID = 'cita-1'

const dbWithRpc = (response: { data: unknown; error: { message: string } | null }) =>
  ({ rpc: vi.fn().mockResolvedValue(response) }) as unknown as SupabaseClient

describe('createSupabaseAppointmentConfirmationRepository', () => {
  it('llama la función y convierte la fila', async () => {
    const db = dbWithRpc({
      data: [{ appointment_id: APPOINTMENT_ID, window_hours: 48, deposit_required: 8000 }],
      error: null,
    })

    const result = await createSupabaseAppointmentConfirmationRepository(db).confirm(APPOINTMENT_ID)

    expect(db.rpc).toHaveBeenCalledWith('scheduling_confirm_appointment', { p_appointment_id: APPOINTMENT_ID })
    expect(isOk(result) && result.value).toEqual({
      appointmentId: APPOINTMENT_ID,
      windowHours: 48,
      depositRequired: 8000,
    })
  })

  it('traduce el rechazo de la base a un error tipado', async () => {
    const db = dbWithRpc({ data: null, error: { message: 'scheduling_appointment_not_confirmable' } })
    const result = await createSupabaseAppointmentConfirmationRepository(db).confirm(APPOINTMENT_ID)
    expect(isErr(result) && isAppointmentNotConfirmable(result.error)).toBe(true)
  })

  it('un fallo de la base no se confunde con una cita no confirmable', async () => {
    const db = dbWithRpc({ data: null, error: { message: 'connection lost' } })
    const result = await createSupabaseAppointmentConfirmationRepository(db).confirm(APPOINTMENT_ID)
    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})

describe('createSupabaseConfirmationPolicyRepository', () => {
  const dbWithPolicy = (response: { data: unknown; error: { message: string } | null }) => {
    const maybeSingle = vi.fn().mockResolvedValue(response)
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    return { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient
  }

  it('lee el plazo', async () => {
    const db = dbWithPolicy({ data: { confirmation_deadline_hours: 48 }, error: null })
    const result = await createSupabaseConfirmationPolicyRepository(db).getDeadlineHours()
    expect(db.from).toHaveBeenCalledWith('scheduling_confirmation_policy')
    expect(isOk(result) && result.value).toBe(48)
  })

  it('sin fila informa el fallo en vez de inventar un plazo', async () => {
    const result = await createSupabaseConfirmationPolicyRepository(dbWithPolicy({ data: null, error: null })).getDeadlineHours()
    expect(isErr(result)).toBe(true)
  })

  it('cambia el plazo por la función', async () => {
    const db = dbWithRpc({ data: [{ previous_hours: 48, new_hours: 24 }], error: null })
    const result = await createSupabaseConfirmationPolicyRepository(db).changeDeadlineHours(24)
    expect(db.rpc).toHaveBeenCalledWith('scheduling_change_confirmation_deadline', { p_hours: 24 })
    expect(isOk(result) && result.value).toEqual({ previousHours: 48, newHours: 24 })
  })

  it('traduce el plazo inválido a un error tipado', async () => {
    const db = dbWithRpc({ data: null, error: { message: 'scheduling_invalid_confirmation_deadline' } })
    const result = await createSupabaseConfirmationPolicyRepository(db).changeDeadlineHours(721)
    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CONFIRMATION_DEADLINE')
  })
})
