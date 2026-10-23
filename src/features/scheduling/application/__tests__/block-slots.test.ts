import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { blockSlots, removeManualBlock } from '../manual-blocks'
import type { DayAvailabilityRepository, ManualBlockRepository } from '../availability-ports'
import type { OpenHours } from '../../domain/day-slots'
import type { ManualBlock } from '../../domain/manual-blocks'
import {
  isAvailabilityEntryNotFound,
  isManualBlockHasAppointment,
  isManualBlockInvalid,
  isManualBlockOverlap,
  manualBlockHasAppointment,
  manualBlockOverlap,
} from '../../domain/availability-errors'

const RESOURCE_ID = 'r-1'
const MONDAY = '2026-10-19'
const minuteOfDay = (hours: number, minutes = 0) => hours * 60 + minutes

type TimeRange = { startsAt: Date; endsAt: Date }
const rangesCross = (first: TimeRange, second: TimeRange) =>
  first.startsAt < second.endsAt && second.startsAt < first.endsAt

function createFakeManualBlockRepository(initialBlocks: ManualBlock[] = [], activeAppointments: TimeRange[] = []) {
  const blocks = [...initialBlocks]
  const insertManyCalls: ManualBlock[][] = []
  const repo: ManualBlockRepository = {
    async listEndingAfter() {
      return blocks
    },
    async releaseRanges() {
      return ok(undefined)
    },
    async insert(block) {
      return repo.insertMany([block])
    },
    async insertMany(candidates) {
      insertManyCalls.push([...candidates])
      const overlapsBlock = candidates.some((candidate) => blocks.some((stored) => rangesCross(stored, candidate)))
      if (overlapsBlock) return err(manualBlockOverlap())
      const overlapsAppointment = candidates.some((candidate) =>
        activeAppointments.some((appointment) => rangesCross(appointment, candidate)),
      )
      if (overlapsAppointment) return err(manualBlockHasAppointment())
      blocks.push(...candidates)
      return ok(undefined)
    },
    async remove(id) {
      const index = blocks.findIndex((stored) => stored.id === id)
      if (index === -1) return false
      blocks.splice(index, 1)
      return true
    },
  }
  return { repo, blocks, insertManyCalls }
}

const fakeDayAvailability = (openHours: OpenHours[]): Pick<DayAvailabilityRepository, 'listOpenHours'> => ({
  async listOpenHours() {
    return openHours
  },
})

const day = fakeDayAvailability([{ startMin: minuteOfDay(8), endMin: minuteOfDay(18) }])

let generatedIds = 0
const newId = () => `new-${++generatedIds}`
const mondayEightAm = fixedClock('2026-10-19T14:00:00Z')

const blockOf = (id: string, from: string, to: string): ManualBlock => ({
  id,
  resourceId: RESOURCE_ID,
  startsAt: fixedDate(from),
  endsAt: fixedDate(to),
  reason: null,
})

describe('blockSlots — US-AGE-07', () => {
  it('bloquea varios espacios de un día; los seguidos quedan en un solo bloqueo (criterio 1)', async () => {
    const { repo, blocks, insertManyCalls } = createFakeManualBlockRepository()
    const result = await blockSlots({ repo, day, newId, clock: mondayEightAm })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9), minuteOfDay(9, 30), minuteOfDay(14)],
      reason: 'trámite',
    })

    expect(isOk(result)).toBe(true)
    expect(insertManyCalls).toHaveLength(1)
    expect(blocks.map((block) => [block.startsAt.toISOString(), block.endsAt.toISOString(), block.reason])).toEqual([
      ['2026-10-19T15:00:00.000Z', '2026-10-19T16:00:00.000Z', 'trámite'],
      ['2026-10-19T20:00:00.000Z', '2026-10-19T20:30:00.000Z', 'trámite'],
    ])
  })

  it('un espacio con una cita activa no se bloquea, ni ninguno de la selección (criterio 4)', async () => {
    const appointment = { startsAt: fixedDate('2026-10-19T17:00:00Z'), endsAt: fixedDate('2026-10-19T18:15:00Z') }
    const { repo, blocks } = createFakeManualBlockRepository([], [appointment])
    const result = await blockSlots({ repo, day, newId, clock: mondayEightAm })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9), minuteOfDay(12)],
    })

    expect(isErr(result) && isManualBlockHasAppointment(result.error)).toBe(true)
    expect(blocks).toEqual([])
  })

  it('un espacio ya bloqueado devuelve solape', async () => {
    const existing = blockOf('b-1', '2026-10-19T15:00:00Z', '2026-10-19T15:30:00Z')
    const { repo } = createFakeManualBlockRepository([existing])
    const result = await blockSlots({ repo, day, newId, clock: mondayEightAm })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9)],
    })
    expect(isErr(result) && isManualBlockOverlap(result.error)).toBe(true)
  })

  it('una fecha inválida o una selección vacía no llegan a la base', async () => {
    const { repo, insertManyCalls } = createFakeManualBlockRepository()
    const invalidInputs = [
      { date: '2026-02-30', slotStartMinutes: [minuteOfDay(9)] },
      { date: MONDAY, slotStartMinutes: [] },
    ]
    for (const input of invalidInputs) {
      const result = await blockSlots({ repo, day, newId, clock: mondayEightAm })({ resourceId: RESOURCE_ID, ...input })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(insertManyCalls).toEqual([])
  })

  it('un espacio que ya terminó no se bloquea, ni ninguno de la selección; uno en curso sí', async () => {
    const { repo, insertManyCalls } = createFakeManualBlockRepository()
    const mondayTenPastTen = fixedClock('2026-10-19T16:10:00Z')
    const selectionsWithPastSlot = [
      { date: '2026-10-18', slotStartMinutes: [minuteOfDay(15)] },
      { date: MONDAY, slotStartMinutes: [minuteOfDay(9, 30), minuteOfDay(11)] },
    ]
    for (const input of selectionsWithPastSlot) {
      const result = await blockSlots({ repo, day, newId, clock: mondayTenPastTen })({ resourceId: RESOURCE_ID, ...input })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(insertManyCalls).toEqual([])

    const slotInProgress = await blockSlots({ repo, day, newId, clock: mondayTenPastTen })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(10)],
    })
    expect(isOk(slotInProgress)).toBe(true)
  })
})

describe('blockSlots — la grilla es la del calendario, no la de la medianoche', () => {
  const openingAtQuarterPast = fakeDayAvailability([{ startMin: minuteOfDay(9, 15), endMin: minuteOfDay(11, 15) }])

  it('un bloque abierto a las 09:15 ofrece 09:15 y 09:45, y se pueden bloquear (criterio 1)', async () => {
    const { repo, blocks } = createFakeManualBlockRepository()
    const result = await blockSlots({ repo, day: openingAtQuarterPast, newId, clock: mondayEightAm })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9, 15), minuteOfDay(9, 45)],
    })

    expect(isOk(result)).toBe(true)
    expect(blocks.map((block) => [block.startsAt.toISOString(), block.endsAt.toISOString()])).toEqual([
      ['2026-10-19T15:15:00.000Z', '2026-10-19T16:15:00.000Z'],
    ])
  })

  it('un espacio de la grilla de la medianoche que ese día no se ofrece se rechaza, y ninguno de la selección se guarda', async () => {
    const { repo, insertManyCalls } = createFakeManualBlockRepository()
    for (const slotStartMinutes of [[minuteOfDay(9)], [minuteOfDay(9, 15), minuteOfDay(9, 30)]]) {
      const result = await blockSlots({ repo, day: openingAtQuarterPast, newId, clock: mondayEightAm })({
        resourceId: RESOURCE_ID,
        date: MONDAY,
        slotStartMinutes,
      })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(insertManyCalls).toEqual([])
  })

  it('un día sin horario abierto no ofrece ningún espacio', async () => {
    const { repo, insertManyCalls } = createFakeManualBlockRepository()
    const result = await blockSlots({ repo, day: fakeDayAvailability([]), newId, clock: mondayEightAm })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9)],
    })
    expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    expect(insertManyCalls).toEqual([])
  })
})

describe('removeManualBlock — US-AGE-07, criterio 3', () => {
  const existing = blockOf('b-1', '2026-10-19T15:00:00Z', '2026-10-19T16:00:00Z')

  it('desbloquea un espacio bloqueado', async () => {
    const { repo, blocks } = createFakeManualBlockRepository([existing])
    expect(isOk(await removeManualBlock({ repo })('b-1'))).toBe(true)
    expect(blocks).toEqual([])
  })

  it('un bloqueo que ya no existe devuelve no encontrado', async () => {
    const { repo } = createFakeManualBlockRepository()
    const result = await removeManualBlock({ repo })('b-1')
    expect(isErr(result) && isAvailabilityEntryNotFound(result.error)).toBe(true)
  })
})
