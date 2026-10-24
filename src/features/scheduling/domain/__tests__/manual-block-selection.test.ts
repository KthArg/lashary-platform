import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { isManualBlockInvalid } from '../availability-errors'
import { selectedSlotsToRanges } from '../manual-block-selection'

const minuteOfDay = (hours: number, minutes = 0) => hours * 60 + minutes
const SLOT_LENGTH_MIN = 30

const rangesOf = (slotStartMinutes: number[]) => {
  const result = selectedSlotsToRanges(slotStartMinutes, SLOT_LENGTH_MIN)
  if (!isOk(result)) throw new Error(`se esperaba ok: ${JSON.stringify(result.error)}`)
  return result.value
}

describe('selectedSlotsToRanges — US-AGE-07, criterio 1', () => {
  it('un espacio es un rango de la duración del espacio', () => {
    expect(rangesOf([minuteOfDay(9)])).toEqual([{ startMin: minuteOfDay(9), endMin: minuteOfDay(9, 30) }])
  })

  it('varios espacios seguidos se unen en un solo rango, sin importar el orden', () => {
    expect(rangesOf([minuteOfDay(10), minuteOfDay(9), minuteOfDay(9, 30)])).toEqual([
      { startMin: minuteOfDay(9), endMin: minuteOfDay(10, 30) },
    ])
  })

  it('espacios separados quedan como rangos separados', () => {
    expect(rangesOf([minuteOfDay(9), minuteOfDay(11), minuteOfDay(11, 30)])).toEqual([
      { startMin: minuteOfDay(9), endMin: minuteOfDay(9, 30) },
      { startMin: minuteOfDay(11), endMin: minuteOfDay(12) },
    ])
  })

  it('un espacio repetido cuenta una vez', () => {
    expect(rangesOf([minuteOfDay(9), minuteOfDay(9)])).toEqual([
      { startMin: minuteOfDay(9), endMin: minuteOfDay(9, 30) },
    ])
  })

  it('el último espacio del día termina a medianoche', () => {
    expect(rangesOf([minuteOfDay(23, 30)])).toEqual([{ startMin: minuteOfDay(23, 30), endMin: 1440 }])
  })

  it('rechaza una selección vacía y espacios fuera del día, no enteros o fuera del intervalo', () => {
    const invalidSelections = [
      [],
      [-30],
      [minuteOfDay(23, 45)],
      [minuteOfDay(9) + 0.5],
      [Number.NaN],
      [minuteOfDay(9, 15)],
      [minuteOfDay(9), minuteOfDay(10, 5)],
    ]
    for (const slotStartMinutes of invalidSelections) {
      const result = selectedSlotsToRanges(slotStartMinutes, SLOT_LENGTH_MIN)
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
  })
})
