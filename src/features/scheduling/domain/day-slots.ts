import { ok, err, isErr, type Result } from '@/shared/result'
import { isCalendarDate, studioLocalToUtc } from '@/shared/studio-time'
import { daySlotsInvalid, type DaySlotsInvalid } from './availability-errors'
import { MINUTES_PER_DAY } from './weekly-availability'

export const SLOT_INTERVAL_MIN = 30

export interface OpenHours {
  readonly startMin: number
  readonly endMin: number
}

export interface BusyRange {
  readonly startsAt: Date
  readonly endsAt: Date
}

export type SlotStatus = 'free' | 'busy'

export interface DaySlot {
  readonly startMin: number
  readonly endMin: number
  readonly status: SlotStatus
}

export interface DaySlotsInput {
  readonly date: string
  readonly durationMin: number
  readonly openHours: readonly OpenHours[]
  readonly busy: readonly BusyRange[]
  readonly now: Date
}

const isValidDuration = (minutes: number): boolean =>
  Number.isInteger(minutes) && minutes > 0 && minutes <= MINUTES_PER_DAY

export function checkDaySlotsQuery(date: string, durationMin: number): Result<void, DaySlotsInvalid> {
  const problems: string[] = []
  if (!isCalendarDate(date)) problems.push('la fecha no es válida')
  if (!isValidDuration(durationMin)) problems.push('la duración del servicio no es válida')
  return problems.length > 0 ? err(daySlotsInvalid(problems)) : ok(undefined)
}

function mergeOpenHours(hours: readonly OpenHours[]): OpenHours[] {
  const merged: { startMin: number; endMin: number }[] = []
  for (const range of [...hours].sort((a, b) => a.startMin - b.startMin)) {
    const last = merged[merged.length - 1]
    if (last && range.startMin <= last.endMin) last.endMin = Math.max(last.endMin, range.endMin)
    else merged.push({ ...range })
  }
  return merged
}

export function computeDaySlots(input: DaySlotsInput): Result<DaySlot[], DaySlotsInvalid> {
  const checked = checkDaySlotsQuery(input.date, input.durationMin)
  if (isErr(checked)) return checked

  const instantOf = (minute: number) => studioLocalToUtc(input.date, minute).getTime()
  const nowMs = input.now.getTime()
  const isBusy = (fromMs: number, toMs: number) =>
    input.busy.some((range) => fromMs < range.endsAt.getTime() && toMs > range.startsAt.getTime())

  const slots: DaySlot[] = []
  for (const open of mergeOpenHours(input.openHours)) {
    for (let start = open.startMin; start + input.durationMin <= open.endMin; start += SLOT_INTERVAL_MIN) {
      const fromMs = instantOf(start)
      if (fromMs < nowMs) continue
      const end = start + input.durationMin
      slots.push({ startMin: start, endMin: end, status: isBusy(fromMs, instantOf(end)) ? 'busy' : 'free' })
    }
  }
  return ok(slots)
}
