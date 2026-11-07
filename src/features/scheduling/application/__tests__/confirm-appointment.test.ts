import { describe, expect, it, vi } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { appointmentNotConfirmable } from '../../domain/errors'
import { changeConfirmationDeadline, confirmAppointment } from '../confirm-appointment'
import type { ConfirmationPolicyRepository } from '../ports'

const APPOINTMENT_ID = 'cita-1'

const policyWith = (change: ConfirmationPolicyRepository['changeDeadlineHours']): ConfirmationPolicyRepository => ({
  getDeadlineHours: vi.fn(),
  changeDeadlineHours: change,
})

describe('confirmAppointment', () => {
  it('devuelve lo que responde el repositorio', async () => {
    const confirmed = { appointmentId: APPOINTMENT_ID, windowHours: 48, depositRequired: 8000 }
    const result = await confirmAppointment({ confirm: async () => ok(confirmed) })(APPOINTMENT_ID)
    expect(result).toEqual(ok(confirmed))
  })

  it('propaga que la cita no se puede confirmar', async () => {
    const failure = appointmentNotConfirmable(APPOINTMENT_ID)
    const result = await confirmAppointment({ confirm: async () => err(failure) })(APPOINTMENT_ID)
    expect(result).toEqual(err(failure))
  })
})

describe('changeConfirmationDeadline', () => {
  it('guarda un plazo válido y devuelve el nuevo', async () => {
    const change = vi.fn(async () => ok({ previousHours: 48, newHours: 24 }))
    const result = await changeConfirmationDeadline(policyWith(change))(24)
    expect(isOk(result) && result.value).toBe(24)
    expect(change).toHaveBeenCalledWith(24)
  })

  it('rechaza un plazo fuera de rango sin tocar la base', async () => {
    const change = vi.fn()
    const result = await changeConfirmationDeadline(policyWith(change))(721)
    expect(isErr(result)).toBe(true)
    expect(change).not.toHaveBeenCalled()
  })
})
