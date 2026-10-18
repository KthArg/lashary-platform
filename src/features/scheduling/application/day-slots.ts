import { isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { checkDaySlotsQuery, computeDaySlots, type DaySlot } from '../domain/day-slots'
import type { DaySlotsInvalid } from '../domain/availability-errors'
import type { DayAvailabilityRepository } from './availability-ports'

export type DaySlotsDeps = {
  repo: DayAvailabilityRepository
  clock: Clock
}

export type DaySlotsQuery = {
  resourceId: string
  date: string
  durationMin: number
}

export const getDaySlots =
  (deps: DaySlotsDeps) =>
  async (query: DaySlotsQuery): Promise<Result<DaySlot[], DaySlotsInvalid>> => {
    const checked = checkDaySlotsQuery(query.date, query.durationMin)
    if (isErr(checked)) return checked

    const [openHours, busy] = await Promise.all([
      deps.repo.listOpenHours(query.resourceId, query.date),
      deps.repo.listBusyRanges(query.resourceId, query.date),
    ])

    return computeDaySlots({
      date: query.date,
      durationMin: query.durationMin,
      openHours,
      busy,
      now: deps.clock(),
    })
  }
