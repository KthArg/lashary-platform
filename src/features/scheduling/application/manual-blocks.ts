import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { isCalendarDate, studioLocalToUtc } from '@/shared/studio-time'
import { createManualBlock, type ManualBlock } from '../domain/manual-blocks'
import { selectedSlotsToRanges } from '../domain/manual-block-selection'
import { computeDaySlots, SLOT_INTERVAL_MIN } from '../domain/day-slots'
import {
  availabilityEntryNotFound,
  manualBlockInvalid,
  type AvailabilityEntryNotFound,
  type ManualBlockHasAppointment,
  type ManualBlockInvalid,
  type ManualBlockOverlap,
} from '../domain/availability-errors'
import { MAX_MANUAL_BLOCKS, type DayAvailabilityRepository, type ManualBlockRepository } from './availability-ports'

export type ManualBlocksDeps = {
  repo: ManualBlockRepository
  newId: () => string
  clock: Clock
}

export type AddManualBlockInput = {
  resourceId: string
  startsAt: Date
  endsAt: Date
  reason?: string | null
}

// Los bloqueos que ya terminaron no le sirven al panel.
export const listUpcomingManualBlocks =
  (deps: Pick<ManualBlocksDeps, 'repo' | 'clock'>) =>
  async (resourceId: string): Promise<ManualBlock[]> =>
    deps.repo.listEndingAfter(resourceId, deps.clock(), MAX_MANUAL_BLOCKS)

// Criterio 3: bloquear manualmente un espacio específico. El no-solape entre bloqueos lo
// garantiza la base (exclusion constraint); el repositorio lo traduce a ManualBlockOverlap.
export const addManualBlock =
  (deps: Pick<ManualBlocksDeps, 'repo' | 'newId'>) =>
  async (
    input: AddManualBlockInput,
  ): Promise<Result<ManualBlock, ManualBlockInvalid | ManualBlockOverlap | ManualBlockHasAppointment>> => {
    const built = createManualBlock({ id: deps.newId(), ...input })
    if (isErr(built)) return built

    const saved = await deps.repo.insert(built.value)
    if (isErr(saved)) return saved

    return ok(built.value)
  }

export type BlockSlotsInput = {
  resourceId: string
  date: string
  slotStartMinutes: readonly number[]
  reason?: string | null
}

export type BlockSlotsError = ManualBlockInvalid | ManualBlockOverlap | ManualBlockHasAppointment

export type BlockSlotsDeps = ManualBlocksDeps & { day: Pick<DayAvailabilityRepository, 'listOpenHours'> }

// Los espacios elegidos tienen que ser de la misma grilla que ve la clienta y que valida la
// reserva (computeDaySlots): parte del inicio de cada bloque abierto, no de la medianoche. Se
// calcula sin descartar los que ya empezaron; el que ya terminó lo rechaza la comprobación de abajo.
export const blockSlots =
  (deps: BlockSlotsDeps) =>
  async (input: BlockSlotsInput): Promise<Result<ManualBlock[], BlockSlotsError>> => {
    if (!isCalendarDate(input.date)) return err(manualBlockInvalid(['la fecha no es válida']))
    const ranges = selectedSlotsToRanges(input.slotStartMinutes, SLOT_INTERVAL_MIN)
    if (isErr(ranges)) return ranges

    const grid = computeDaySlots({
      date: input.date,
      durationMin: SLOT_INTERVAL_MIN,
      openHours: await deps.day.listOpenHours(input.resourceId, input.date),
      busy: [],
      now: studioLocalToUtc(input.date, 0),
    })
    if (isErr(grid)) return err(manualBlockInvalid(['la fecha no es válida']))
    const offeredStarts = new Set(grid.value.map((slot) => slot.startMin))
    if (input.slotStartMinutes.some((startMinute) => !offeredStarts.has(startMinute))) {
      return err(manualBlockInvalid(['un espacio elegido no se ofrece ese día']))
    }

    const now = deps.clock()
    const blocks: ManualBlock[] = []
    for (const range of ranges.value) {
      const endsAt = studioLocalToUtc(input.date, range.endMin)
      if (endsAt <= now) return err(manualBlockInvalid(['un espacio elegido ya pasó']))
      const built = createManualBlock({
        id: deps.newId(),
        resourceId: input.resourceId,
        startsAt: studioLocalToUtc(input.date, range.startMin),
        endsAt,
        reason: input.reason,
      })
      if (isErr(built)) return built
      blocks.push(built.value)
    }

    const saved = await deps.repo.insertMany(blocks)
    if (isErr(saved)) return saved

    return ok(blocks)
  }

export const removeManualBlock =
  (deps: Pick<ManualBlocksDeps, 'repo'>) =>
  async (id: string): Promise<Result<void, AvailabilityEntryNotFound>> =>
    (await deps.repo.remove(id)) ? ok(undefined) : err(availabilityEntryNotFound(id))
