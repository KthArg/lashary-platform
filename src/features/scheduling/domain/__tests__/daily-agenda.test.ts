import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isDailyAgendaInvalid } from '../availability-errors'
import {
  buildAgenda,
  derivePaymentStatus,
  studioDayRange,
  toAgendaEntry,
  type AgendaAppointment,
} from '../daily-agenda'
import { DEPOSIT_PAYMENT_STATUS } from '../daily-agenda.constants'

const baseAppointment: AgendaAppointment = {
  id: 'cita-1',
  status: 'approved',
  startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-01T17:30:00Z'),
  clientId: 'clienta-1',
  clientName: 'Ana Mora',
  techniqueName: 'Volumen ruso',
  isFirstTime: true,
  depositRequired: 20000,
  depositRegistered: 0,
}

describe('studioDayRange', () => {
  it('el día del estudio va de la medianoche local a la siguiente, en UTC (criterio 4)', () => {
    const range = studioDayRange('2027-03-01')
    expect(isOk(range)).toBe(true)
    if (!isOk(range)) return
    expect(range.value.fromMs).toBe(Date.parse('2027-03-01T06:00:00Z'))
    expect(range.value.untilMs).toBe(Date.parse('2027-03-02T06:00:00Z'))
  })

  it('una cita a las 20:00 locales cae en su día aunque en UTC ya sea el siguiente', () => {
    const range = studioDayRange('2027-03-01')
    if (!isOk(range)) throw new Error('rango inválido')
    const lateAppointmentMs = Date.parse('2027-03-02T02:00:00Z')
    expect(lateAppointmentMs).toBeGreaterThanOrEqual(range.value.fromMs)
    expect(lateAppointmentMs).toBeLessThan(range.value.untilMs)
  })

  it('cruza el fin de mes y de año', () => {
    const range = studioDayRange('2027-12-31')
    if (!isOk(range)) throw new Error('rango inválido')
    expect(range.value.untilMs).toBe(Date.parse('2028-01-01T06:00:00Z'))
  })

  it.each(['2027-02-30', '2027-13-01', 'hoy', '', '2027-3-1'])('rechaza la fecha %j', (date) => {
    const range = studioDayRange(date)
    expect(isErr(range)).toBe(true)
    if (isErr(range)) expect(isDailyAgendaInvalid(range.error)).toBe(true)
  })
})

describe('derivePaymentStatus', () => {
  it('sin anticipo requerido no hay nada que cobrar', () => {
    expect(derivePaymentStatus(0, 0)).toBe(DEPOSIT_PAYMENT_STATUS.NOT_REQUIRED)
  })

  it('sin nada registrado el anticipo está sin pagar', () => {
    expect(derivePaymentStatus(20000, 0)).toBe(DEPOSIT_PAYMENT_STATUS.UNPAID)
  })

  it('registrado menos que lo requerido es parcial', () => {
    expect(derivePaymentStatus(20000, 5000)).toBe(DEPOSIT_PAYMENT_STATUS.PARTIAL)
  })

  it('registrado igual a lo requerido está cubierto', () => {
    expect(derivePaymentStatus(20000, 20000)).toBe(DEPOSIT_PAYMENT_STATUS.COVERED)
  })

  it('una cita sin snapshot de anticipo no inventa un estado', () => {
    expect(derivePaymentStatus(null, null)).toBeNull()
    expect(derivePaymentStatus(20000, null)).toBeNull()
  })
})

describe('toAgendaEntry', () => {
  it('calcula la duración del servicio en minutos (criterio 1)', () => {
    expect(toAgendaEntry(baseAppointment).durationMin).toBe(90)
  })

  it('conserva clienta, técnica y si es su primera vez (criterios 1 y 2)', () => {
    const entry = toAgendaEntry(baseAppointment)
    expect(entry.clientId).toBe('clienta-1')
    expect(entry.clientName).toBe('Ana Mora')
    expect(entry.techniqueName).toBe('Volumen ruso')
    expect(entry.isFirstTime).toBe(true)
    expect(entry.paymentStatus).toBe(DEPOSIT_PAYMENT_STATUS.UNPAID)
  })

  it('una cita anterior al snapshot sale con técnica, primera vez y pago en null', () => {
    const entry = toAgendaEntry({
      ...baseAppointment,
      techniqueName: null,
      isFirstTime: null,
      depositRequired: null,
      depositRegistered: null,
    })
    expect(entry.techniqueName).toBeNull()
    expect(entry.isFirstTime).toBeNull()
    expect(entry.paymentStatus).toBeNull()
  })
})

describe('buildAgenda', () => {
  it('ordena cronológicamente sin importar el orden de entrada (criterio 1)', () => {
    const agenda = buildAgenda([
      {
        ...baseAppointment,
        id: 'tarde',
        startsAtMs: Date.parse('2027-03-01T20:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T21:00:00Z'),
      },
      {
        ...baseAppointment,
        id: 'manana',
        startsAtMs: Date.parse('2027-03-01T14:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T15:00:00Z'),
      },
      { ...baseAppointment, id: 'medio' },
    ])
    expect(agenda.map((entry) => entry.id)).toEqual(['manana', 'medio', 'tarde'])
  })

  it('con la misma hora desempata por id para que el orden sea estable', () => {
    const agenda = buildAgenda([
      { ...baseAppointment, id: 'b' },
      { ...baseAppointment, id: 'a' },
    ])
    expect(agenda.map((entry) => entry.id)).toEqual(['a', 'b'])
  })

  it('a la misma hora, la rechazada va después de la que se atiende', () => {
    const agenda = buildAgenda([
      { ...baseAppointment, id: 'a', status: 'rejected' },
      { ...baseAppointment, id: 'b', status: 'approved' },
    ])
    expect(agenda.map((entry) => entry.id)).toEqual(['b', 'a'])
  })

  it('un día sin citas da una agenda vacía', () => {
    expect(buildAgenda([])).toEqual([])
  })
})
