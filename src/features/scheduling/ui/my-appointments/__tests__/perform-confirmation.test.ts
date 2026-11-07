import { describe, expect, it, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { appointmentNotConfirmable, storageFailed } from '@/features/scheduling/domain/errors'
import { confirmationMessages } from '../constants/confirmation-strings'
import { performConfirmAppointment, type ConfirmationDeps } from '../utils/perform-confirmation'

const APPOINTMENT_ID = '00000000-0000-4000-8000-00000000ca01'

const depsWith = (overrides: Partial<ConfirmationDeps> = {}): ConfirmationDeps => ({
  isClient: async () => true,
  confirm: async (appointmentId) => ok({ appointmentId, windowHours: 48, depositRequired: 8000 }),
  ...overrides,
})

describe('performConfirmAppointment', () => {
  it('con anticipo requerido, advierte la política vigente de cancelación (criterio 3)', async () => {
    expect(await performConfirmAppointment(APPOINTMENT_ID, depsWith())).toEqual({
      ok: true,
      message: confirmationMessages.confirmedWithPolicy('48 horas'),
    })
  })

  it('sin anticipo requerido no hay nada que perder y no lo advierte', async () => {
    const deps = depsWith({
      confirm: async (appointmentId) => ok({ appointmentId, windowHours: 48, depositRequired: 0 }),
    })
    expect(await performConfirmAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: true,
      message: confirmationMessages.confirmed,
    })
  })

  it('sin ventana de cancelación no advierte ninguna pérdida', async () => {
    const deps = depsWith({
      confirm: async (appointmentId) => ok({ appointmentId, windowHours: 0, depositRequired: 8000 }),
    })
    expect(await performConfirmAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: true,
      message: confirmationMessages.confirmed,
    })
  })

  it('quien no es clienta no llega a confirmar', async () => {
    const confirm = vi.fn()
    const result = await performConfirmAppointment(APPOINTMENT_ID, depsWith({ isClient: async () => false, confirm }))
    expect(result).toEqual({ ok: false, message: confirmationMessages.accessDenied })
    expect(confirm).not.toHaveBeenCalled()
  })

  it('rechaza un id que no es un uuid', async () => {
    const confirm = vi.fn()
    const result = await performConfirmAppointment('no-es-un-id', depsWith({ confirm }))
    expect(result).toEqual({ ok: false, message: confirmationMessages.invalidAppointment })
    expect(confirm).not.toHaveBeenCalled()
  })

  it('explica que la cita ya no se puede confirmar', async () => {
    const deps = depsWith({ confirm: async () => err(appointmentNotConfirmable(APPOINTMENT_ID)) })
    expect(await performConfirmAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: confirmationMessages.notConfirmable,
    })
  })

  it('un fallo de la base se informa como fallo', async () => {
    const deps = depsWith({ confirm: async () => err(storageFailed('sin conexión')) })
    expect(await performConfirmAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: confirmationMessages.failed,
    })
  })
})
