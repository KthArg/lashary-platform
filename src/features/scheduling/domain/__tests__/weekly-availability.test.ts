import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createWeeklyBlock,
  findOverlappingBlock,
  sortWeeklyBlocks,
  weeklyBlocksOverlap,
  type WeeklyBlock,
} from '../weekly-availability'
import { isWeeklyBlockInvalid } from '../availability-errors'

const RESOURCE = 'r-1'

const block = (overrides: Partial<WeeklyBlock> = {}): WeeklyBlock => ({
  id: 'b-1',
  resourceId: RESOURCE,
  weekday: 1,
  startMin: 540,
  endMin: 720,
  ...overrides,
})

describe('createWeeklyBlock — US-AGE-01, criterio 1', () => {
  it('acepta un bloque lunes 09:00–12:00', () => {
    const result = createWeeklyBlock(block())
    expect(isOk(result) && result.value).toEqual(block())
  })

  it('acepta un bloque hasta la medianoche (fin = 1440)', () => {
    expect(isOk(createWeeklyBlock(block({ startMin: 1200, endMin: 1440 })))).toBe(true)
  })

  it.each([
    ['día 0', { weekday: 0 }],
    ['día 8', { weekday: 8 }],
    ['día no entero', { weekday: 1.5 }],
    ['inicio negativo', { startMin: -1 }],
    ['fin después de medianoche', { endMin: 1441 }],
    ['minutos no enteros', { startMin: 540.5 }],
  ])('rechaza %s', (_label, overrides) => {
    const result = createWeeklyBlock(block(overrides))
    expect(isErr(result) && isWeeklyBlockInvalid(result.error)).toBe(true)
  })

  it('rechaza inicio igual o posterior al fin', () => {
    for (const overrides of [{ startMin: 720, endMin: 720 }, { startMin: 780, endMin: 720 }]) {
      const result = createWeeklyBlock(block(overrides))
      expect(isErr(result) && result.error.problems).toEqual([
        'la hora de inicio debe ser anterior a la de fin',
      ])
    }
  })
})

describe('weeklyBlocksOverlap', () => {
  it('detecta un solape el mismo día y recurso', () => {
    expect(weeklyBlocksOverlap(block(), block({ id: 'b-2', startMin: 600, endMin: 660 }))).toBe(true)
  })

  it('bloques contiguos no se solapan (rango semiabierto)', () => {
    expect(weeklyBlocksOverlap(block(), block({ id: 'b-2', startMin: 720, endMin: 900 }))).toBe(false)
  })

  it('el mismo horario en otro día u otro recurso no se solapa', () => {
    expect(weeklyBlocksOverlap(block(), block({ id: 'b-2', weekday: 2 }))).toBe(false)
    expect(weeklyBlocksOverlap(block(), block({ id: 'b-2', resourceId: 'r-2' }))).toBe(false)
  })

  it('findOverlappingBlock devuelve el bloque en conflicto', () => {
    const existing = [block({ id: 'b-2', weekday: 2 }), block({ id: 'b-3', startMin: 700, endMin: 800 })]
    expect(findOverlappingBlock(block(), existing)?.id).toBe('b-3')
    expect(findOverlappingBlock(block({ weekday: 5 }), existing)).toBeUndefined()
  })
})

describe('sortWeeklyBlocks', () => {
  it('ordena por día y luego por hora de inicio', () => {
    const sorted = sortWeeklyBlocks([
      block({ id: 'c', weekday: 3, startMin: 60, endMin: 120 }),
      block({ id: 'b', weekday: 1, startMin: 800, endMin: 900 }),
      block({ id: 'a', weekday: 1, startMin: 60, endMin: 120 }),
    ])
    expect(sorted.map((b) => b.id)).toEqual(['a', 'b', 'c'])
  })
})
