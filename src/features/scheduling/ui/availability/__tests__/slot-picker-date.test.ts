import { describe, it, expect } from 'vitest'
import { readSlotPickerDate } from '../utils/slot-picker-date'

const TODAY = '2026-10-19'

describe('readSlotPickerDate — US-AGE-07', () => {
  it('usa el día de la URL si es una fecha real de hoy en adelante', () => {
    expect(readSlotPickerDate({ fecha: '2026-10-25' }, TODAY)).toBe('2026-10-25')
    expect(readSlotPickerDate({ fecha: TODAY }, TODAY)).toBe(TODAY)
  })

  it('sin día, con un día pasado o con una fecha inválida, vuelve a hoy', () => {
    for (const searchParams of [{}, { fecha: '2026-10-18' }, { fecha: '2026-02-30' }, { fecha: 'mañana' }]) {
      expect(readSlotPickerDate(searchParams, TODAY)).toBe(TODAY)
    }
  })

  it('con el parámetro repetido toma el primero', () => {
    expect(readSlotPickerDate({ fecha: ['2026-10-21', '2026-10-22'] }, TODAY)).toBe('2026-10-21')
  })
})
