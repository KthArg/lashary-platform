import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { Money } from '@/shared/money'
import { appointmentNotCancellable, clientNotRegistered, storageFailed } from '../../../domain/errors'
import type { CancellationQuote } from '../../../application/ports'
import { cancellationMessages } from '../constants/cancellation-strings'
import { performCancelAppointment, performQuoteCancellation, type CancellationDeps } from '../utils/perform-cancellation'

const APPOINTMENT_ID = '00000000-0000-0000-0000-00000000ca01'
const WINDOW_HOURS = 48
const DEPOSIT = 10000
const deposit = Money.fromColones(DEPOSIT).toString()
const quote: CancellationQuote = {
  startsAtMs: Date.parse('2027-09-10T15:00:00Z'),
  techniqueName: 'Clásicas',
  withinWindow: false,
  windowHours: WINDOW_HOURS,
  forfeitedDeposit: DEPOSIT,
}

function createDeps(overrides: Partial<CancellationDeps> = {}) {
  const calls: string[] = []
  const deps: CancellationDeps = {
    isClient: async () => true,
    quote: async (appointmentId) => (calls.push(`quote:${appointmentId}`), ok(quote)),
    cancel: async (appointmentId) =>
      (calls.push(`cancel:${appointmentId}`),
      ok({ appointmentId, withinWindow: false, forfeitedDeposit: DEPOSIT })),
    ...overrides,
  }
  return { deps, calls }
}

describe('performQuoteCancellation', () => {
  it('fuera de la ventana y con anticipo, avisa cuánto se pierde antes de confirmar (criterio 2)', async () => {
    const { deps } = createDeps()
    const result = await performQuoteCancellation(APPOINTMENT_ID, deps)

    expect(result).toEqual({
      ok: true,
      quote: {
        appointmentId: APPOINTMENT_ID,
        consequence: cancellationMessages.outsideWindowLosesDeposit(cancellationMessages.hours(WINDOW_HOURS), deposit),
        losesDeposit: true,
      },
    })
  })

  it('dentro de la ventana dice que no se pierde nada', async () => {
    const { deps } = createDeps({ quote: async () => ok({ ...quote, withinWindow: true, forfeitedDeposit: 0 }) })
    const result = await performQuoteCancellation(APPOINTMENT_ID, deps)

    expect(result).toMatchObject({
      ok: true,
      quote: { consequence: cancellationMessages.withinWindow, losesDeposit: false },
    })
  })

  it('fuera de la ventana pero sin nada que perder lo dice sin hablar de pérdida', async () => {
    const { deps } = createDeps({ quote: async () => ok({ ...quote, forfeitedDeposit: 0, windowHours: 1 }) })
    const result = await performQuoteCancellation(APPOINTMENT_ID, deps)

    expect(result).toMatchObject({
      ok: true,
      quote: {
        consequence: cancellationMessages.outsideWindowNothingToLose(cancellationMessages.hours(1)),
        losesDeposit: false,
      },
    })
  })

  it('quien no es clienta no cotiza y no se consulta nada', async () => {
    const { deps, calls } = createDeps({ isClient: async () => false })

    expect(await performQuoteCancellation(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: cancellationMessages.accessDenied,
    })
    expect(calls).toEqual([])
  })

  it.each([undefined, null, 42, '', 'cita-1'])('un identificador inválido (%s) se rechaza sin consultar', async (rawId) => {
    const { deps, calls } = createDeps()

    expect(await performQuoteCancellation(rawId, deps)).toEqual({
      ok: false,
      message: cancellationMessages.invalidAppointment,
    })
    expect(calls).toEqual([])
  })

  it.each([
    [clientNotRegistered(), cancellationMessages.clientNotRegistered],
    [appointmentNotCancellable(APPOINTMENT_ID), cancellationMessages.notCancellable],
    [storageFailed('connection refused'), cancellationMessages.failed],
  ])('el error %o llega como su mensaje, sin lanzar', async (error, message) => {
    const { deps } = createDeps({ quote: async () => err(error) })

    expect(await performQuoteCancellation(APPOINTMENT_ID, deps)).toEqual({ ok: false, message })
  })
})

describe('performCancelAppointment', () => {
  it('cancela la cita y avisa que el anticipo se dio por perdido cuando se perdió (criterio 6)', async () => {
    const { deps, calls } = createDeps()

    expect(await performCancelAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: true,
      message: cancellationMessages.cancelledLosingDeposit,
    })
    expect(calls).toEqual([`cancel:${APPOINTMENT_ID}`])
  })

  it('cancelar sin perder anticipo lo dice sin hablar de pérdida (criterio 3)', async () => {
    const { deps } = createDeps({
      cancel: async (appointmentId) => ok({ appointmentId, withinWindow: true, forfeitedDeposit: 0 }),
    })

    expect(await performCancelAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: true,
      message: cancellationMessages.cancelled,
    })
  })

  it('quien no es clienta no cancela y no se llama a la base', async () => {
    const { deps, calls } = createDeps({ isClient: async () => false })

    expect(await performCancelAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: cancellationMessages.accessDenied,
    })
    expect(calls).toEqual([])
  })

  it('un identificador inválido se rechaza sin llamar a la base', async () => {
    const { deps, calls } = createDeps()

    expect(await performCancelAppointment('no-es-un-uuid', deps)).toEqual({
      ok: false,
      message: cancellationMessages.invalidAppointment,
    })
    expect(calls).toEqual([])
  })

  it('una cita que ya no se puede cancelar da su mensaje y nunca finge éxito', async () => {
    const { deps } = createDeps({ cancel: async () => err(appointmentNotCancellable(APPOINTMENT_ID)) })

    expect(await performCancelAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: cancellationMessages.notCancellable,
    })
  })

  it('un fallo de la base se avisa, nunca se da por cancelada', async () => {
    const { deps } = createDeps({ cancel: async () => err(storageFailed('connection refused')) })

    expect(await performCancelAppointment(APPOINTMENT_ID, deps)).toEqual({
      ok: false,
      message: cancellationMessages.failed,
    })
  })
})
