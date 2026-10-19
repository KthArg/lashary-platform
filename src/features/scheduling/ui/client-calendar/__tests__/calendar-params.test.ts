import { describe, it, expect } from 'vitest'
import { calendarHref, calendarRequestKey, readCalendarParams } from '../utils/calendar-params'

const TODAY = '2026-10-19'

describe('calendar-params — US-AGE-02', () => {
  it('lee el servicio y una fecha futura válida', () => {
    expect(readCalendarParams({ servicio: 't1', fecha: '2026-10-25' }, TODAY)).toEqual({
      serviceKey: 't1',
      date: '2026-10-25',
    })
  })

  it('sin parámetros: sin servicio y hoy', () => {
    expect(readCalendarParams({}, TODAY)).toEqual({ serviceKey: undefined, date: TODAY })
  })

  it('un parámetro repetido usa el primero', () => {
    expect(readCalendarParams({ servicio: ['a', 'b'], fecha: ['2026-10-20', '2026-10-21'] }, TODAY)).toEqual({
      serviceKey: 'a',
      date: '2026-10-20',
    })
  })

  it('arma el enlace con o sin fecha', () => {
    expect(calendarHref({ serviceKey: 't1.retoque', date: '2026-10-20' })).toBe(
      '/portal/citas/calendario?servicio=t1.retoque&fecha=2026-10-20',
    )
    expect(calendarHref({ serviceKey: 't1' })).toBe('/portal/citas/calendario?servicio=t1')
    expect(calendarHref({})).toBe('/portal/citas/calendario')
  })

  it('la clave del pedido cambia con el servicio o el día, y no con otros parámetros (UI-003)', () => {
    const key = calendarRequestKey({ servicio: 't1', fecha: '2026-10-20' })
    expect(calendarRequestKey({ servicio: 't1', fecha: '2026-10-20', otro: 'x' })).toBe(key)
    expect(calendarRequestKey({ servicio: 't1', fecha: '2026-10-21' })).not.toBe(key)
    expect(calendarRequestKey({ servicio: 't2', fecha: '2026-10-20' })).not.toBe(key)
    expect(calendarRequestKey({})).toBe('|')
  })
})
