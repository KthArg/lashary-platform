import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  closeAsCompleted,
  closeAsNoShow,
  needsClosing,
  type ClosableAppointment,
  type DeliveredService,
} from '../appointment-closing'

const APPOINTMENT_ENDS_AT_MS = Date.parse('2026-11-02T16:00:00Z')
const ONE_MINUTE_MS = 60_000
const AFTER_END_MS = APPOINTMENT_ENDS_AT_MS + ONE_MINUTE_MS
const BEFORE_END_MS = APPOINTMENT_ENDS_AT_MS - ONE_MINUTE_MS
const RESERVED_TECHNIQUE_ID = 'technique-reserved'
const OTHER_TECHNIQUE_ID = 'technique-other'
const RESERVED_FROZEN_PRICE = 25000
const CATALOG_PRICE_TODAY_FOR_RESERVED = 30000
const OTHER_TECHNIQUE_PRICE = 18000
const REGISTERED_DEPOSIT = 5000

const approvedAppointment: ClosableAppointment = {
  id: 'appointment-1',
  status: 'approved',
  endsAtMs: APPOINTMENT_ENDS_AT_MS,
  techniqueId: RESERVED_TECHNIQUE_ID,
  servicePrice: RESERVED_FROZEN_PRICE,
  depositRegistered: REGISTERED_DEPOSIT,
}

const reservedServiceAtTodaysPrice: DeliveredService = {
  techniqueId: RESERVED_TECHNIQUE_ID,
  price: CATALOG_PRICE_TODAY_FOR_RESERVED,
}

const otherService: DeliveredService = { techniqueId: OTHER_TECHNIQUE_ID, price: OTHER_TECHNIQUE_PRICE }

describe('needsClosing', () => {
  it.each(['approved', 'confirmed'])('una cita %s que ya terminó espera cierre', (status) => {
    expect(needsClosing({ status, endsAtMs: APPOINTMENT_ENDS_AT_MS }, AFTER_END_MS)).toBe(true)
  })

  it('una cita que todavía no termina no espera cierre', () => {
    expect(needsClosing(approvedAppointment, BEFORE_END_MS)).toBe(false)
  })

  it.each(['pending_approval', 'rejected', 'cancelled', 'completed', 'no_show'])(
    'una cita %s no espera cierre aunque haya pasado',
    (status) => {
      expect(needsClosing({ status, endsAtMs: APPOINTMENT_ENDS_AT_MS }, AFTER_END_MS)).toBe(false)
    },
  )
})

describe('closeAsCompleted', () => {
  it('el cargo es el precio congelado en la cita si se prestó el servicio reservado, no el del catálogo de hoy', () => {
    const result = closeAsCompleted(approvedAppointment, reservedServiceAtTodaysPrice, AFTER_END_MS)

    expect(isOk(result) && result.value.chargeAmount).toBe(RESERVED_FROZEN_PRICE)
  })

  it('el cargo es el precio del servicio prestado si difiere del reservado', () => {
    const result = closeAsCompleted(approvedAppointment, otherService, AFTER_END_MS)

    expect(isOk(result) && result.value.chargeAmount).toBe(OTHER_TECHNIQUE_PRICE)
  })

  it('el anticipo registrado se descuenta y el pago final es la diferencia', () => {
    const result = closeAsCompleted(approvedAppointment, reservedServiceAtTodaysPrice, AFTER_END_MS)

    expect(isOk(result) && result.value).toEqual({
      outcome: 'completed',
      chargeAmount: RESERVED_FROZEN_PRICE,
      depositCredit: REGISTERED_DEPOSIT,
      amountDue: RESERVED_FROZEN_PRICE - REGISTERED_DEPOSIT,
      forfeitedDeposit: 0,
    })
  })

  it('sin anticipo registrado se debe todo el cargo', () => {
    const result = closeAsCompleted({ ...approvedAppointment, depositRegistered: 0 }, otherService, AFTER_END_MS)

    expect(isOk(result) && result.value.amountDue).toBe(OTHER_TECHNIQUE_PRICE)
  })

  it('si el anticipo supera el cargo, lo que se debe es negativo', () => {
    const result = closeAsCompleted({ ...approvedAppointment, depositRegistered: 40000 }, otherService, AFTER_END_MS)

    expect(isOk(result) && result.value.amountDue).toBe(OTHER_TECHNIQUE_PRICE - 40000)
  })

  it.each([
    ['todavía no terminó', approvedAppointment, BEFORE_END_MS],
    ['está pendiente de aprobación', { ...approvedAppointment, status: 'pending_approval' }, AFTER_END_MS],
    ['ya está cerrada', { ...approvedAppointment, status: 'completed' }, AFTER_END_MS],
    ['fue cancelada', { ...approvedAppointment, status: 'cancelled' }, AFTER_END_MS],
  ])('no cierra una cita que %s', (_description, appointment, nowMs) => {
    const result = closeAsCompleted(appointment, reservedServiceAtTodaysPrice, nowMs)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CLOSABLE')
  })

  it.each([0, -1, 1.5, Number.NaN])('rechaza un precio de %s para el servicio prestado', (price) => {
    const result = closeAsCompleted(approvedAppointment, { techniqueId: OTHER_TECHNIQUE_ID, price }, AFTER_END_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CLOSING_AMOUNT')
  })

  it('rechaza un anticipo registrado que no es un monto entero', () => {
    const result = closeAsCompleted({ ...approvedAppointment, depositRegistered: -5 }, otherService, AFTER_END_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CLOSING_AMOUNT')
  })
})

describe('closeAsNoShow', () => {
  it('la ausencia no genera cargo y el anticipo registrado se pierde', () => {
    const result = closeAsNoShow(approvedAppointment, AFTER_END_MS)

    expect(isOk(result) && result.value).toEqual({
      outcome: 'no_show',
      chargeAmount: 0,
      depositCredit: 0,
      amountDue: 0,
      forfeitedDeposit: REGISTERED_DEPOSIT,
    })
  })

  it('sin anticipo registrado no se pierde nada', () => {
    const result = closeAsNoShow({ ...approvedAppointment, depositRegistered: 0 }, AFTER_END_MS)

    expect(isOk(result) && result.value.forfeitedDeposit).toBe(0)
  })

  it('no cierra una cita que todavía no terminó', () => {
    const result = closeAsNoShow(approvedAppointment, BEFORE_END_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CLOSABLE')
  })

  it('no cierra una cita que no está aprobada ni confirmada', () => {
    const result = closeAsNoShow({ ...approvedAppointment, status: 'rejected' }, AFTER_END_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CLOSABLE')
  })
})
