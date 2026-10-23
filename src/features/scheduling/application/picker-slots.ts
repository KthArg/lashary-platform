import { isErr, ok, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { addCalendarDays, studioLocalToUtc } from '@/shared/studio-time'
import { markManualBlocks, type PickerSlot } from '../domain/manual-block-selection'
import { SLOT_INTERVAL_MIN } from '../domain/day-slots'
import type { DaySlotsInvalid } from '../domain/availability-errors'
import { getDaySlots } from './day-slots'
import type { DayAvailabilityRepository, ManualBlockRepository } from './availability-ports'

export type PickerSlotsDeps = {
  day: DayAvailabilityRepository
  blocks: Pick<ManualBlockRepository, 'listInRange'>
  clock: Clock
}

export const getPickerSlots =
  (deps: PickerSlotsDeps) =>
  async (resourceId: string, date: string): Promise<Result<PickerSlot[], DaySlotsInvalid>> => {
    const slots = await getDaySlots({ repo: deps.day, clock: deps.clock })({
      resourceId,
      date,
      durationMin: SLOT_INTERVAL_MIN,
    })
    if (isErr(slots)) return slots

    const blocks = await deps.blocks.listInRange(
      resourceId,
      studioLocalToUtc(date, 0).getTime(),
      studioLocalToUtc(addCalendarDays(date, 1), 0).getTime(),
    )
    return ok(markManualBlocks(date, slots.value, blocks))
  }
