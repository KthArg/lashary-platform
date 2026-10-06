import { describe, it, expect } from 'vitest'
import { noAppointmentHistoryYet } from '../no-appointment-history'

describe('noAppointmentHistoryYet', () => {
  it('siempre reporta que no hay cita completada (criterio 2 diferido hasta US-AGE-05)', async () => {
    expect(await noAppointmentHistoryYet.hasCompletedAppointment('c1', 't1')).toBe(false)
    expect(await noAppointmentHistoryYet.hasCompletedAppointment('c2', 't2')).toBe(false)
  })
})
