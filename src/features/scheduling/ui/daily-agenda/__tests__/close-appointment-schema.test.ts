import { describe, it, expect } from 'vitest'
import { CLOSE_AFTERCARE_NOTE_MAX_LENGTH } from '../constants/close-appointment.constants'
import { closeAppointmentSchema } from '../validation/close-appointment-schema'

const APPOINTMENT_ID = '3f1c6a52-8d4e-4b1a-9c2f-5a7e1d0b9c11'

const completedWith = (aftercareNote?: string) =>
  closeAppointmentSchema.safeParse({ appointmentId: APPOINTMENT_ID, outcome: 'completed', aftercareNote })

describe('closeAppointmentSchema, nota de indicaciones', () => {
  it('recorta los espacios de la nota', () => {
    const result = completedWith('  Evitar agua 24 horas  ')

    expect(result.success && result.data.aftercareNote).toBe('Evitar agua 24 horas')
  })

  it('una nota vacía o solo de espacios queda sin nota', () => {
    const result = completedWith('   ')

    expect(result.success && result.data.aftercareNote).toBeUndefined()
  })

  it('acepta una nota del largo máximo y rechaza una que lo pasa', () => {
    expect(completedWith('a'.repeat(CLOSE_AFTERCARE_NOTE_MAX_LENGTH)).success).toBe(true)
    expect(completedWith('a'.repeat(CLOSE_AFTERCARE_NOTE_MAX_LENGTH + 1)).success).toBe(false)
  })

  it('una ausencia con nota es inválida, y sin nota o con nota vacía es válida', () => {
    const noShowWith = (aftercareNote?: string) =>
      closeAppointmentSchema.safeParse({ appointmentId: APPOINTMENT_ID, outcome: 'no_show', aftercareNote })

    expect(noShowWith('Evitar agua').success).toBe(false)
    expect(noShowWith().success).toBe(true)
    expect(noShowWith('  ').success).toBe(true)
  })
})
