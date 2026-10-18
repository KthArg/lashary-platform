import { isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { computeDaySlots, studioDayRange, type DaySlot } from '../domain/day-slots'
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

// Espacios de un día para la clienta (US-AGE-02). Valida la fecha antes de tocar la base y lee
// horario y ocupado en paralelo, siempre de la base: sin caché, un cambio de la administradora
// se ve en la siguiente lectura (criterio 4).
export const getDaySlots =
  (deps: DaySlotsDeps) =>
  async (query: DaySlotsQuery): Promise<Result<DaySlot[], DaySlotsInvalid>> => {
    const range = studioDayRange(query.date)
    if (isErr(range)) return range

    const [openHours, busy] = await Promise.all([
      deps.repo.listOpenHours(query.resourceId, query.date),
      deps.repo.listBusyRanges(query.resourceId, range.value.from, range.value.to),
    ])

    return computeDaySlots({
      date: query.date,
      durationMin: query.durationMin,
      openHours,
      busy,
      now: deps.clock(),
    })
  }
