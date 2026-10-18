import { ok, err, type Result } from '@/shared/result'
import { addCalendarDays, isCalendarDate, studioLocalToUtc } from '@/shared/studio-time'
import { daySlotsInvalid, type DaySlotsInvalid } from './availability-errors'
import { MINUTES_PER_DAY } from './weekly-availability'

// Espacios de un día del calendario de la clienta (US-AGE-02). Horas de pared del estudio en
// minutos desde la medianoche, como los bloques semanales; lo ocupado llega como instantes UTC
// (DOM-003). La hora actual entra como dato (DOM-004).

// Un inicio cada media hora. Supuesto pendiente de confirmar con el PO.
export const SLOT_INTERVAL_MIN = 30

export interface OpenHours {
  readonly startMin: number
  readonly endMin: number
}

// Solo el rango: un espacio ocupado no sabe de quién es ni qué servicio es (criterio 2).
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

export interface StudioDayRange {
  readonly from: Date
  readonly to: Date
}

// El día como rango de instantes: de la medianoche del estudio a la siguiente.
export function studioDayRange(date: string): Result<StudioDayRange, DaySlotsInvalid> {
  if (!isCalendarDate(date)) return err(daySlotsInvalid(['la fecha no es válida']))
  return ok({ from: studioLocalToUtc(date, 0), to: studioLocalToUtc(addCalendarDays(date, 1), 0) })
}

const isValidDuration = (minutes: number): boolean =>
  Number.isInteger(minutes) && minutes > 0 && minutes <= MINUTES_PER_DAY

// Bloques que se solapan o se tocan se unen: un servicio puede cruzar de uno al siguiente.
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
  const problems: string[] = []
  if (!isCalendarDate(input.date)) problems.push('la fecha no es válida')
  if (!isValidDuration(input.durationMin)) problems.push('la duración del servicio no es válida')
  if (problems.length > 0) return err(daySlotsInvalid(problems))

  const instantOf = (minute: number) => studioLocalToUtc(input.date, minute).getTime()
  const nowMs = input.now.getTime()
  // Rangos semiabiertos: lo ocupado que solo toca el borde del espacio no lo ocupa.
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
