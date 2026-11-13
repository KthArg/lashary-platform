import { describe, expect, it } from 'vitest'
import { AFTERCARE_NOTE_MAX_LENGTH } from '@/features/notifications'
import { CLOSE_AFTERCARE_NOTE_MAX_LENGTH } from '../constants/close-appointment.constants'

describe('tope de la nota de cuidados al cerrar la cita', () => {
  it('es el mismo que acepta notifications al guardar las indicaciones', () => {
    expect(CLOSE_AFTERCARE_NOTE_MAX_LENGTH).toBe(AFTERCARE_NOTE_MAX_LENGTH)
  })
})
