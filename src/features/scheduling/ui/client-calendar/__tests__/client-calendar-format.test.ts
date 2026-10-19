import { describe, it, expect } from 'vitest'
import { clientCalendarMessages } from '../constants/client-calendar-strings'
import { toCalendarView } from '../utils/client-calendar-format'
import type { ClientCalendarData } from '../types/client-calendar.types'

const firstTime = { key: 't1', techniqueId: 't1', name: 'Volumen ruso', isFirstTime: true, durationMin: 135 }
const retouch = { ...firstTime, key: 't1.retoque', isFirstTime: false, durationMin: 105 }
const base = { options: [firstTime, retouch], date: '2026-10-21', today: '2026-10-19' }

describe('toCalendarView — US-AGE-02', () => {
  it('formatea en el servidor los espacios, el día y los enlaces a los días vecinos', () => {
    const data: ClientCalendarData = {
      ...base,
      status: 'ready',
      selected: retouch,
      slots: [
        { startMin: 540, endMin: 645, status: 'free' },
        { startMin: 570, endMin: 675, status: 'busy' },
      ],
    }
    expect(toCalendarView(data)).toEqual({
      status: 'ready',
      picker: {
        date: '2026-10-21',
        selectedKey: 't1.retoque',
        options: [
          { key: 't1', label: clientCalendarMessages.serviceOption('Volumen ruso', true, 135) },
          { key: 't1.retoque', label: clientCalendarMessages.serviceOption('Volumen ruso', false, 105) },
        ],
      },
      day: {
        title: 'miércoles, 21 de octubre de 2026',
        previousHref: '/portal/citas/calendario?servicio=t1.retoque&fecha=2026-10-20',
        nextHref: '/portal/citas/calendario?servicio=t1.retoque&fecha=2026-10-22',
      },
      slots: [
        { startMin: 540, range: '09:00–10:45', busy: false },
        { startMin: 570, range: '09:30–11:15', busy: true },
      ],
    })
  })

  it('hoy no ofrece día anterior', () => {
    const view = toCalendarView({ ...base, date: '2026-10-19', status: 'invalid', selected: firstTime })
    expect(view.status === 'invalid' && view.day.previousHref).toBeNull()
  })

  it('sin servicio elegido no hay día ni espacios; forbidden y noServices pasan tal cual', () => {
    expect(toCalendarView({ ...base, status: 'chooseService' })).toEqual({
      status: 'chooseService',
      picker: { date: '2026-10-21', selectedKey: undefined, options: expect.any(Array) },
    })
    expect(toCalendarView({ status: 'forbidden' })).toEqual({ status: 'forbidden' })
    expect(toCalendarView({ status: 'noServices' })).toEqual({ status: 'noServices' })
  })
})
