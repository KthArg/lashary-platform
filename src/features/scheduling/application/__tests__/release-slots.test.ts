import { describe, it, expect } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { releaseSlots } from '../manual-blocks'
import { getPickerSlots } from '../picker-slots'
import type { DayAvailabilityRepository, ManualBlockRepository, MsRange } from '../availability-ports'
import type { OpenHours } from '../../domain/day-slots'
import type { ManualBlock } from '../../domain/manual-blocks'
import {
  isManualBlockHasAppointment,
  isManualBlockInvalid,
  isManualBlockNotBlocked,
  manualBlockHasAppointment,
  manualBlockNotBlocked,
  type ManualBlockHasAppointment,
  type ManualBlockNotBlocked,
} from '../../domain/availability-errors'

const RESOURCE_ID = 'r-1'
const MONDAY = '2026-10-19'
const minuteOfDay = (hours: number, minutes = 0) => hours * 60 + minutes
const at = (iso: string) => Date.parse(iso)

const dayOf = (openHours: OpenHours[]): DayAvailabilityRepository => ({
  async listOpenHours() {
    return openHours
  },
  async listBusyRanges() {
    return []
  },
})
const openFromEightToSix = dayOf([{ startMin: minuteOfDay(8), endMin: minuteOfDay(18) }])

function createFakeBlocks(failure?: ManualBlockNotBlocked | ManualBlockHasAppointment, stored: ManualBlock[] = []) {
  const releaseCalls: Array<[string, MsRange[]]> = []
  const repo: Pick<ManualBlockRepository, 'releaseRanges' | 'listInRange'> = {
    async releaseRanges(resourceId, ranges) {
      releaseCalls.push([resourceId, [...ranges]])
      return failure ? err(failure) : ok(undefined)
    },
    async listInRange(_resourceId, fromMs, untilMs) {
      return stored.filter((block) => block.startsAt.getTime() < untilMs && block.endsAt.getTime() > fromMs)
    },
  }
  return { repo, releaseCalls }
}

describe('releaseSlots — US-AGE-07, criterio 3', () => {
  it('libera varios espacios que no son seguidos en una sola llamada, en hora del estudio convertida a UTC', async () => {
    const { repo, releaseCalls } = createFakeBlocks()
    const result = await releaseSlots({ repo, day: openFromEightToSix })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(13), minuteOfDay(9, 30), minuteOfDay(9)],
    })

    expect(isOk(result)).toBe(true)
    expect(releaseCalls).toEqual([
      [
        RESOURCE_ID,
        [
          { fromMs: at('2026-10-19T15:00:00Z'), toMs: at('2026-10-19T16:00:00Z') },
          { fromMs: at('2026-10-19T19:00:00Z'), toMs: at('2026-10-19T19:30:00Z') },
        ],
      ],
    ])
  })

  it('los espacios seguidos se unen en un solo rango, igual que al bloquear', async () => {
    const { repo, releaseCalls } = createFakeBlocks()
    await releaseSlots({ repo, day: openFromEightToSix })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(10), minuteOfDay(9, 30), minuteOfDay(9)],
    })
    expect(releaseCalls[0][1]).toEqual([{ fromMs: at('2026-10-19T15:00:00Z'), toMs: at('2026-10-19T16:30:00Z') }])
  })

  it('un espacio fuera de la grilla del calendario se rechaza sin llegar a la base', async () => {
    const { repo, releaseCalls } = createFakeBlocks()
    const quarterPast = dayOf([{ startMin: minuteOfDay(9, 15), endMin: minuteOfDay(11, 15) }])
    const input = { resourceId: RESOURCE_ID, date: MONDAY }

    const onGrid = await releaseSlots({ repo, day: quarterPast })({ ...input, slotStartMinutes: [minuteOfDay(9, 15)] })
    expect(isOk(onGrid)).toBe(true)
    releaseCalls.length = 0

    for (const slotStartMinutes of [[minuteOfDay(9)], [minuteOfDay(9, 15), minuteOfDay(9, 30)]]) {
      const result = await releaseSlots({ repo, day: quarterPast })({ ...input, slotStartMinutes })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(releaseCalls).toEqual([])
  })

  it('una fecha inválida o una selección vacía no llegan a la base', async () => {
    const { repo, releaseCalls } = createFakeBlocks()
    for (const input of [
      { date: '2026-02-30', slotStartMinutes: [minuteOfDay(9)] },
      { date: MONDAY, slotStartMinutes: [] },
    ]) {
      const result = await releaseSlots({ repo, day: openFromEightToSix })({ resourceId: RESOURCE_ID, ...input })
      expect(isErr(result) && isManualBlockInvalid(result.error)).toBe(true)
    }
    expect(releaseCalls).toEqual([])
  })

  it('devuelve tal cual que un espacio ya no estaba bloqueado', async () => {
    const { repo } = createFakeBlocks(manualBlockNotBlocked())
    const result = await releaseSlots({ repo, day: openFromEightToSix })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9)],
    })
    expect(isErr(result) && isManualBlockNotBlocked(result.error)).toBe(true)
  })

  it('devuelve tal cual el rechazo por una cita activa debajo de lo que sobra', async () => {
    const { repo } = createFakeBlocks(manualBlockHasAppointment())
    const result = await releaseSlots({ repo, day: openFromEightToSix })({
      resourceId: RESOURCE_ID,
      date: MONDAY,
      slotStartMinutes: [minuteOfDay(9)],
    })
    expect(isErr(result) && isManualBlockHasAppointment(result.error)).toBe(true)
  })
})

describe('getPickerSlots — qué espacios del día son bloqueos manuales', () => {
  const mondayEightAm = fixedClock('2026-10-19T13:00:00Z')
  const manualBlock = (from: string, to: string): ManualBlock => ({
    id: 'b-1',
    resourceId: RESOURCE_ID,
    startsAt: fixedDate(from),
    endsAt: fixedDate(to),
    reason: null,
  })

  it('marca bloqueado lo que cae dentro de un bloqueo manual y libre lo demás', async () => {
    const day: DayAvailabilityRepository = {
      ...dayOf([{ startMin: minuteOfDay(8), endMin: minuteOfDay(11) }]),
      async listBusyRanges() {
        return [{ startsAt: fixedDate('2026-10-19T15:00:00Z'), endsAt: fixedDate('2026-10-19T16:00:00Z') }]
      },
    }
    const { repo } = createFakeBlocks(undefined, [manualBlock('2026-10-19T15:00:00Z', '2026-10-19T16:00:00Z')])

    const result = await getPickerSlots({ day, blocks: repo, clock: mondayEightAm })(RESOURCE_ID, MONDAY)

    expect(isOk(result)).toBe(true)
    expect(isOk(result) && result.value.map((slot) => [slot.startMin, slot.status])).toEqual([
      [minuteOfDay(8), 'free'],
      [minuteOfDay(8, 30), 'free'],
      [minuteOfDay(9), 'blocked'],
      [minuteOfDay(9, 30), 'blocked'],
      [minuteOfDay(10), 'free'],
      [minuteOfDay(10, 30), 'free'],
    ])
  })

  it('lo ocupado que no es un bloqueo manual (una cita) sigue siendo ocupado, no se puede liberar', async () => {
    const day: DayAvailabilityRepository = {
      ...dayOf([{ startMin: minuteOfDay(8), endMin: minuteOfDay(10) }]),
      async listBusyRanges() {
        return [{ startsAt: fixedDate('2026-10-19T14:00:00Z'), endsAt: fixedDate('2026-10-19T14:30:00Z') }]
      },
    }
    const { repo } = createFakeBlocks()

    const result = await getPickerSlots({ day, blocks: repo, clock: mondayEightAm })(RESOURCE_ID, MONDAY)

    expect(isOk(result) && result.value[0]).toMatchObject({ startMin: minuteOfDay(8), status: 'busy' })
  })

  it('una fecha inválida se rechaza', async () => {
    const { repo } = createFakeBlocks()
    const result = await getPickerSlots({ day: openFromEightToSix, blocks: repo, clock: mondayEightAm })(
      RESOURCE_ID,
      '2026-02-30',
    )
    expect(isErr(result)).toBe(true)
  })
})
