import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { fixedClock, fixedDate } from '@/shared/testing/fixed-clock'
import { getDaySlots } from '../day-slots'
import type { DayAvailabilityRepository } from '../availability-ports'
import { isDaySlotsInvalid } from '../../domain/availability-errors'
import type { BusyRange, OpenHours } from '../../domain/day-slots'

const RESOURCE = 'r-1'
const MONDAY = '2026-10-19'

function fakeRepo(openHours: OpenHours[] = [], busy: BusyRange[] = []) {
  const calls: { openHours: unknown[][]; busy: unknown[][] } = { openHours: [], busy: [] }
  const repo: DayAvailabilityRepository = {
    async listOpenHours(...args) {
      calls.openHours.push(args)
      return openHours
    },
    async listBusyRanges(...args) {
      calls.busy.push(args)
      return busy
    },
  }
  return { repo, calls, openHours }
}

const clock = fixedClock('2026-10-01T12:00:00Z')

describe('getDaySlots — US-AGE-02', () => {
  it('pide el horario de la fecha y lo ocupado del día del estudio, y calcula los espacios', async () => {
    const { repo, calls } = fakeRepo(
      [{ startMin: 540, endMin: 660 }],
      [{ startsAt: fixedDate('2026-10-19T15:00:00Z'), endsAt: fixedDate('2026-10-19T15:30:00Z') }],
    )
    const result = await getDaySlots({ repo, clock })({ resourceId: RESOURCE, date: MONDAY, durationMin: 60 })

    expect(calls.openHours).toEqual([[RESOURCE, MONDAY]])
    expect(calls.busy).toEqual([
      [RESOURCE, fixedDate('2026-10-19T06:00:00Z'), fixedDate('2026-10-20T06:00:00Z')],
    ])
    expect(isOk(result) && result.value.map((slot) => slot.status)).toEqual(['busy', 'free', 'free'])
  })

  it('una fecha inválida no consulta la base', async () => {
    const { repo, calls } = fakeRepo()
    const result = await getDaySlots({ repo, clock })({ resourceId: RESOURCE, date: '2026-02-30', durationMin: 60 })
    expect(isErr(result) && isDaySlotsInvalid(result.error)).toBe(true)
    expect(calls.openHours).toEqual([])
    expect(calls.busy).toEqual([])
  })

  it('lee la base en cada llamada: un cambio de la administradora se ve en la siguiente (criterio 4)', async () => {
    const { repo, openHours } = fakeRepo([{ startMin: 540, endMin: 600 }])
    const read = () => getDaySlots({ repo, clock })({ resourceId: RESOURCE, date: MONDAY, durationMin: 60 })

    const before = await read()
    openHours.splice(0, openHours.length)
    const after = await read()

    expect(isOk(before) && before.value).toHaveLength(1)
    expect(isOk(after) && after.value).toEqual([])
  })
})
