import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'
import { APPOINTMENT_DISPLAY_CHOICE } from '../constants/appointment-display.constants'
import { formatAppointmentSlot } from '../utils/format-appointment-slot'
import { formatAppointmentSummary } from '../utils/format-appointment-summary'

const CHOICE = { techniqueName: 'Clásicas', isFirstTime: true, servicePrice: 35000, depositRequired: 10000 }
const price = (colones: number) => Money.fromColones(colones).toString()

describe('formatAppointmentSummary', () => {
  it('muestra el servicio, que es primera vez, y el precio con el anticipo', () => {
    expect(formatAppointmentSummary(CHOICE)).toEqual({
      service: 'Clásicas',
      kind: APPOINTMENT_DISPLAY_CHOICE.firstTime,
      amounts: APPOINTMENT_DISPLAY_CHOICE.priceAndDeposit(price(35000), price(10000)),
    })
  })

  it('un retoque se rotula como retoque', () => {
    expect(formatAppointmentSummary({ ...CHOICE, isFirstTime: false }).kind).toBe(APPOINTMENT_DISPLAY_CHOICE.retouch)
  })

  it('sin anticipo lo dice en vez de mostrar cero colones', () => {
    expect(formatAppointmentSummary({ ...CHOICE, depositRequired: 0 }).amounts).toBe(
      APPOINTMENT_DISPLAY_CHOICE.priceNoDeposit(price(35000)),
    )
  })

  it('una cita sin elección guardada dice que el servicio no está registrado', () => {
    expect(formatAppointmentSummary(null)).toEqual({
      service: APPOINTMENT_DISPLAY_CHOICE.noService,
      kind: null,
      amounts: null,
    })
  })
})

describe('formatAppointmentSlot', () => {
  it('escribe el día completo y el rango de horas en la hora del estudio', () => {
    const startsAtMs = Date.parse('2027-09-10T15:00:00Z')
    const endsAtMs = Date.parse('2027-09-10T16:00:00Z')

    const slot = formatAppointmentSlot(startsAtMs, endsAtMs).replace(/\s/g, ' ')

    expect(slot).toBe('viernes, 10 de septiembre de 2027 · 9:00 a. m. – 10:00 a. m.')
  })
})
