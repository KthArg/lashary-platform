import { describe, it, expect } from 'vitest'
import type { RescheduleQuote } from '../../../application/ports'
import type { DaySlot } from '../../../domain/day-slots'
import { cancellationMessages } from '../../my-appointments/constants/cancellation-strings'
import { studioLocalToUtc } from '@/shared/studio-time'
import { reschedulePageMessages, reschedulePath } from '../constants/reschedule-page-strings'
import { toRescheduleView } from '../utils/reschedule-page-format'

const APPOINTMENT_ID = '00000000-0000-0000-0000-00000000ea01'
const TODAY = '2027-09-06'
const TOMORROW = '2027-09-07'
const DAY_AFTER_TOMORROW = '2027-09-08'
const WINDOW_HOURS = 48
const quote: RescheduleQuote = {
  startsAtMs: Date.parse('2027-09-10T15:00:00Z'),
  endsAtMs: Date.parse('2027-09-10T16:00:00Z'),
  occupiedMinutes: 75,
  techniqueName: 'Clásicas',
  status: 'approved',
  rescheduleCount: 0,
  maxReschedules: 2,
  windowHours: WINDOW_HOURS,
  blockedBy: null,
}
const freeSlot: DaySlot = { startMin: 540, endMin: 615, status: 'free' }
const busySlot: DaySlot = { startMin: 570, endMin: 645, status: 'busy' }

describe('toRescheduleView', () => {
  it.each(['forbidden', 'notReschedulable', 'failed'] as const)('%s pasa tal cual, sin datos de la cita', (status) => {
    expect(toRescheduleView({ status }, APPOINTMENT_ID)).toEqual({ status })
  })

  it('una cita fuera de la ventana explica que solo se puede cancelar, con las horas de la ventana', () => {
    const view = toRescheduleView({ status: 'blocked', quote: { ...quote, blockedBy: 'outside_window' } }, APPOINTMENT_ID)

    expect(view).toMatchObject({
      status: 'blocked',
      message: reschedulePageMessages.outsideWindow(cancellationMessages.hours(WINDOW_HOURS)),
    })
  })

  it.each([
    [1, '1 vez'],
    [2, '2 veces'],
  ])('una cita en el tope de %i dice cuántas veces se reagendó', (maxReschedules, expected) => {
    const view = toRescheduleView(
      { status: 'blocked', quote: { ...quote, maxReschedules, rescheduleCount: maxReschedules, blockedBy: 'limit_reached' } },
      APPOINTMENT_ID,
    )

    expect(view).toMatchObject({ status: 'blocked', message: expect.stringContaining(expected) })
  })

  it('con el tope en 0 dice que por ahora no se reagenda', () => {
    const view = toRescheduleView(
      { status: 'blocked', quote: { ...quote, maxReschedules: 0, blockedBy: 'limit_reached' } },
      APPOINTMENT_ID,
    )

    expect(view).toMatchObject({ message: reschedulePageMessages.limitReached(0) })
  })

  it('la cita actual lleva el servicio y el horario en la hora del estudio', () => {
    const view = toRescheduleView(
      { status: 'ready', quote, date: TODAY, today: TODAY, slots: [] },
      APPOINTMENT_ID,
    )

    expect(view).toMatchObject({ status: 'ready', current: expect.stringContaining('Clásicas') })
    expect(view.status === 'ready' && view.current).toContain('9:00')
  })

  it('con espacios: cada uno trae su rango y si está ocupado, y dice cuántos reagendados quedan', () => {
    const view = toRescheduleView(
      { status: 'ready', quote: { ...quote, rescheduleCount: 1 }, date: TODAY, today: TODAY, slots: [freeSlot, busySlot] },
      APPOINTMENT_ID,
    )

    expect(view).toMatchObject({
      status: 'ready',
      appointmentId: APPOINTMENT_ID,
      expectedStatus: 'approved',
      remaining: reschedulePageMessages.remaining(1),
      slots: [
        { startMin: 540, range: '09:00–10:15', busy: false, startsAtMs: studioLocalToUtc(TODAY, 540).getTime() },
        { startMin: 570, range: '09:30–10:45', busy: true, startsAtMs: studioLocalToUtc(TODAY, 570).getTime() },
      ],
    })
  })

  it.each([
    ['approved', reschedulePageMessages.backToPending],
    ['confirmed', reschedulePageMessages.backToPending],
    ['pending_approval', reschedulePageMessages.keepsPending],
  ] as const)('una cita %s avisa lo que pasa con su estado al reagendar', (status, consequence) => {
    const view = toRescheduleView(
      { status: 'ready', quote: { ...quote, status }, date: TODAY, today: TODAY, slots: [] },
      APPOINTMENT_ID,
    )

    expect(view).toMatchObject({ status: 'ready', expectedStatus: status, consequence })
  })

  it('hoy no tiene día anterior; el siguiente apunta al día siguiente de la misma cita', () => {
    const view = toRescheduleView({ status: 'ready', quote, date: TODAY, today: TODAY, slots: [] }, APPOINTMENT_ID)

    expect(view.status === 'ready' && view.day).toMatchObject({
      previousHref: null,
      nextHref: reschedulePath(APPOINTMENT_ID, TOMORROW),
    })
  })

  it('un día futuro puede volver al anterior', () => {
    const view = toRescheduleView(
      { status: 'invalid', quote, date: TOMORROW, today: TODAY },
      APPOINTMENT_ID,
    )

    expect(view.status === 'invalid' && view.day).toMatchObject({
      previousHref: reschedulePath(APPOINTMENT_ID, TODAY),
      nextHref: reschedulePath(APPOINTMENT_ID, DAY_AFTER_TOMORROW),
    })
  })
})
