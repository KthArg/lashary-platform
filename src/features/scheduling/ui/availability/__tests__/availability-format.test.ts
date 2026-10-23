import { describe, it, expect } from 'vitest'
import {
  formatCalendarDate,
  minutesToTime,
  toClosedDateViews,
  toManualBlockViews,
  toSlotPickerView,
  toWeeklyDays,
} from '../utils/availability-format'

describe('availability-format', () => {
  it('minutesToTime escribe HH:MM, con 24:00 para la medianoche final', () => {
    expect(minutesToTime(0)).toBe('00:00')
    expect(minutesToTime(570)).toBe('09:30')
    expect(minutesToTime(1440)).toBe('24:00')
  })

  it('toWeeklyDays muestra los siete días, con sus bloques en orden', () => {
    const days = toWeeklyDays([
      { id: 'a', resourceId: 'r', weekday: 1, startMin: 540, endMin: 720 },
      { id: 'b', resourceId: 'r', weekday: 1, startMin: 780, endMin: 1020 },
      { id: 'c', resourceId: 'r', weekday: 6, startMin: 540, endMin: 780 },
    ])
    expect(days.map((day) => day.label)).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ])
    expect(days[0].blocks).toEqual([
      { id: 'a', range: '09:00–12:00' },
      { id: 'b', range: '13:00–17:00' },
    ])
    expect(days[1].blocks).toEqual([])
    expect(days[5].blocks).toEqual([{ id: 'c', range: '09:00–13:00' }])
  })

  it('formatCalendarDate no corre la fecha un día', () => {
    expect(formatCalendarDate('2026-12-25')).toMatch(/25 de diciembre de 2026/)
  })

  it('toClosedDateViews traduce el tipo', () => {
    const [view] = toClosedDateViews([
      { id: 'c', resourceId: 'r', date: '2026-12-25', kind: 'holiday', label: 'Navidad' },
    ])
    expect(view).toMatchObject({ id: 'c', kind: 'Feriado', label: 'Navidad' })
  })

  it('toManualBlockViews muestra la hora del estudio, no la UTC', () => {
    const [view] = toManualBlockViews([
      {
        id: 'm',
        resourceId: 'r',
        startsAt: new Date('2026-10-20T15:00:00Z'),
        endsAt: new Date('2026-10-20T17:00:00Z'),
        reason: null,
      },
    ])
    expect(view.range).toBe('09:00–11:00')
    expect(view.date).toMatch(/20 de octubre/)
  })

  it('toSlotPickerView da a cada espacio su horario y si está ocupado (US-AGE-07)', () => {
    expect(
      toSlotPickerView('2026-10-19', [
        { startMin: 540, endMin: 570, status: 'free' },
        { startMin: 570, endMin: 600, status: 'busy' },
      ]),
    ).toEqual({
      date: '2026-10-19',
      dateLabel: 'lunes, 19 de octubre de 2026',
      slots: [
        { startMin: 540, range: '09:00–09:30', busy: false },
        { startMin: 570, range: '09:30–10:00', busy: true },
      ],
    })
  })
})
