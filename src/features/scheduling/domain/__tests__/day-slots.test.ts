import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { isDaySlotsInvalid } from '../availability-errors'
import {
  checkDaySlotsQuery,
  computeDaySlots,
  SLOT_INTERVAL_MIN,
  type DaySlotsInput,
} from '../day-slots'

const MONDAY = '2026-10-19'
const H = (hours: number, minutes = 0) => hours * 60 + minutes

const costaRica = (date: string, time: string) => fixedDate(`${date}T${time}:00-06:00`)

const input = (overrides: Partial<DaySlotsInput> = {}): DaySlotsInput => ({
  date: MONDAY,
  durationMin: 60,
  openHours: [{ startMin: H(9), endMin: H(11) }],
  busy: [],
  now: costaRica('2026-10-01', '00:00'),
  ...overrides,
})

const slotsOf = (overrides: Partial<DaySlotsInput> = {}) => {
  const result = computeDaySlots(input(overrides))
  if (!isOk(result)) throw new Error(`se esperaba ok: ${JSON.stringify(result.error)}`)
  return result.value
}

const starts = (overrides: Partial<DaySlotsInput> = {}) => slotsOf(overrides).map((slot) => slot.startMin)

describe('computeDaySlots — US-AGE-02', () => {
  it('ofrece un inicio cada SLOT_INTERVAL_MIN mientras la duración quepa (criterio 1)', () => {
    expect(SLOT_INTERVAL_MIN).toBe(30)
    expect(slotsOf()).toEqual([
      { startMin: H(9), endMin: H(10), status: 'free' },
      { startMin: H(9, 30), endMin: H(10, 30), status: 'free' },
      { startMin: H(10), endMin: H(11), status: 'free' },
    ])
  })

  it('usa la duración recibida (servicio + limpieza) y no ofrece lo que no cabe (criterio 5)', () => {
    expect(starts({ durationMin: 90 })).toEqual([H(9), H(9, 30)])
    expect(slotsOf({ durationMin: 150 })).toEqual([])
  })

  it('un día sin horario (cerrado o sin bloques) no tiene espacios', () => {
    expect(slotsOf({ openHours: [] })).toEqual([])
  })

  it('marca ocupado todo espacio que se cruza con un rango ocupado (criterios 1 y 3)', () => {
    const busy = [{ startsAt: costaRica(MONDAY, '09:30'), endsAt: costaRica(MONDAY, '10:00') }]
    expect(slotsOf({ busy }).map((slot) => slot.status)).toEqual(['busy', 'busy', 'free'])
  })

  it('lo ocupado que solo toca el borde no ocupa el espacio', () => {
    const busy = [
      { startsAt: costaRica(MONDAY, '08:00'), endsAt: costaRica(MONDAY, '09:00') },
      { startsAt: costaRica(MONDAY, '11:00'), endsAt: costaRica(MONDAY, '12:00') },
    ]
    expect(slotsOf({ busy }).every((slot) => slot.status === 'free')).toBe(true)
  })

  it('lo ocupado de otro día no afecta', () => {
    const busy = [{ startsAt: costaRica('2026-10-20', '09:00'), endsAt: costaRica('2026-10-20', '11:00') }]
    expect(slotsOf({ busy }).every((slot) => slot.status === 'free')).toBe(true)
  })

  it('un espacio ocupado no revela de quién es ni qué servicio es (criterio 2)', () => {
    const busy = [
      { startsAt: costaRica(MONDAY, '09:00'), endsAt: costaRica(MONDAY, '11:00'), clientName: 'Ana', service: 'Volumen' },
    ]
    const taken = slotsOf({ busy }).find((slot) => slot.status === 'busy')
    expect(Object.keys(taken ?? {}).sort()).toEqual(['endMin', 'startMin', 'status'])
  })

  it('une bloques que se solapan o se tocan, sin repetir espacios', () => {
    const openHours = [
      { startMin: H(10, 30), endMin: H(11) },
      { startMin: H(9), endMin: H(10) },
      { startMin: H(9, 30), endMin: H(10, 30) },
    ]
    expect(starts({ openHours })).toEqual([H(9), H(9, 30), H(10)])
  })

  it('no ofrece espacios que ya empezaron', () => {
    expect(starts({ now: costaRica(MONDAY, '09:15') })).toEqual([H(9, 30), H(10)])
    expect(slotsOf({ now: costaRica(MONDAY, '12:00') })).toEqual([])
  })

  it('rechaza fechas inexistentes y duraciones que no son minutos enteros positivos', () => {
    for (const overrides of [
      { date: '2026-02-30' },
      { date: '19/10/2026' },
      { durationMin: 0 },
      { durationMin: -30 },
      { durationMin: 45.5 },
      { durationMin: Number.NaN },
    ]) {
      const result = computeDaySlots(input(overrides))
      expect(isErr(result) && isDaySlotsInvalid(result.error)).toBe(true)
    }
  })
})

describe('checkDaySlotsQuery', () => {
  it('acepta una fecha real con una duración que cabe en el día', () => {
    expect(isOk(checkDaySlotsQuery(MONDAY, 60))).toBe(true)
  })

  it('rechaza una fecha inexistente y una duración inválida', () => {
    for (const [date, durationMin] of [['2026-02-29', 60], [MONDAY, 0], [MONDAY, 45.5]] as const) {
      const checked = checkDaySlotsQuery(date, durationMin)
      expect(isErr(checked) && isDaySlotsInvalid(checked.error)).toBe(true)
    }
  })
})
