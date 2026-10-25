import { ok, err, type Result } from '@/shared/result'
import { studioLocalToUtc } from '@/shared/studio-time'
import { manualBlockInvalid, type ManualBlockInvalid } from './availability-errors'
import type { DaySlot } from './day-slots'
import type { ManualBlock } from './manual-blocks'
import { MINUTES_PER_DAY } from './weekly-availability'

export interface SelectedBlockRange {
  readonly startMin: number
  readonly endMin: number
}

const isSlotStart = (startMinute: number, slotLengthMin: number): boolean =>
  Number.isInteger(startMinute) && startMinute >= 0 && startMinute + slotLengthMin <= MINUTES_PER_DAY

export function selectedSlotsToRanges(
  slotStartMinutes: readonly number[],
  slotLengthMin: number,
): Result<SelectedBlockRange[], ManualBlockInvalid> {
  if (slotStartMinutes.length === 0) return err(manualBlockInvalid(['no se eligió ningún espacio']))
  if (slotStartMinutes.some((startMinute) => !isSlotStart(startMinute, slotLengthMin))) {
    return err(manualBlockInvalid(['un espacio elegido no es válido']))
  }

  const uniqueSortedStarts = [...new Set(slotStartMinutes)].sort((left, right) => left - right)
  const ranges: { startMin: number; endMin: number }[] = []
  for (const startMinute of uniqueSortedStarts) {
    const previousRange = ranges[ranges.length - 1]
    if (previousRange && startMinute <= previousRange.endMin) {
      previousRange.endMin = Math.max(previousRange.endMin, startMinute + slotLengthMin)
    } else {
      ranges.push({ startMin: startMinute, endMin: startMinute + slotLengthMin })
    }
  }
  return ok(ranges)
}

export type PickerSlotStatus = 'free' | 'busy' | 'blocked'

export interface PickerSlot {
  readonly startMin: number
  readonly endMin: number
  readonly status: PickerSlotStatus
}

export function markManualBlocks(
  date: string,
  slots: readonly DaySlot[],
  blocks: readonly Pick<ManualBlock, 'startsAt' | 'endsAt'>[],
): PickerSlot[] {
  return slots.map((slot) => {
    if (slot.status === 'free') return { startMin: slot.startMin, endMin: slot.endMin, status: 'free' }
    const fromMs = studioLocalToUtc(date, slot.startMin).getTime()
    const toMs = studioLocalToUtc(date, slot.endMin).getTime()
    const insideManualBlock = blocks.some((block) => block.startsAt.getTime() <= fromMs && toMs <= block.endsAt.getTime())
    return { startMin: slot.startMin, endMin: slot.endMin, status: insideManualBlock ? 'blocked' : 'busy' }
  })
}
