import { STUDIO_TIME_ZONE } from '@/shared/studio-time'
import type { WeeklyBlock } from '../../../domain/weekly-availability'
import type { ClosedDate } from '../../../domain/closed-dates'
import type { ManualBlock } from '../../../domain/manual-blocks'
import { maxReleaseSteps, shortenedEndMs } from '../../../domain/manual-block-release'
import type { DaySlot } from '../../../domain/day-slots'
import { schedulingMessages } from '../../messages'
import type { SlotPickerView } from '../types/slot-picker.types'

// Vistas ya formateadas en el servidor, en la zona del estudio: el navegador no reinterpreta
// fechas con su propia zona y el HTML del servidor coincide con el del cliente.

const availabilityMessages = schedulingMessages.availability
const LOCALE = 'es-CR'

const pad = (value: number) => String(value).padStart(2, '0')

export const minutesToTime = (minutes: number): string =>
  `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: STUDIO_TIME_ZONE,
})

const instantDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: STUDIO_TIME_ZONE,
})

// Fecha de calendario AAAA-MM-DD; se formatea como UTC para que no se corra un día.
export const formatCalendarDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number)
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))
}

export type WeeklyDayView = {
  weekday: number
  label: string
  blocks: Array<{ id: string; range: string }>
}

// Los siete días siempre aparecen, aunque no tengan bloques: un día vacío es un día sin atención.
export const toWeeklyDays = (blocks: readonly WeeklyBlock[]): WeeklyDayView[] =>
  availabilityMessages.weekdays.map((label, index) => ({
    weekday: index + 1,
    label,
    blocks: blocks
      .filter((block) => block.weekday === index + 1)
      .map((block) => ({
        id: block.id,
        range: `${minutesToTime(block.startMin)}–${minutesToTime(block.endMin)}`,
      })),
  }))

export type ClosedDateView = { id: string; date: string; kind: string; label: string | null }

export const toClosedDateViews = (dates: readonly ClosedDate[]): ClosedDateView[] =>
  dates.map((closed) => ({
    id: closed.id,
    date: formatCalendarDate(closed.date),
    kind: availabilityMessages.closed.kinds[closed.kind],
    label: closed.label,
  }))

export const toSlotPickerView = (date: string, slots: readonly DaySlot[]): SlotPickerView => ({
  date,
  dateLabel: formatCalendarDate(date),
  slots: slots.map((slot) => ({
    startMin: slot.startMin,
    range: `${minutesToTime(slot.startMin)}–${minutesToTime(slot.endMin)}`,
    busy: slot.status === 'busy',
  })),
})

export type ManualBlockView = {
  id: string
  date: string
  range: string
  reason: string | null
  // Fin actual en ISO: viaja con el formulario de liberar para detectar un bloqueo que cambió.
  endsAtIso: string
  // Hora de fin que quedaría al liberar 1, 2, … espacios, ya formateada en la zona del estudio.
  releaseEnds: string[]
}

const releaseEndsOf = (block: ManualBlock): string[] =>
  Array.from({ length: maxReleaseSteps(block) }, (_, index) => {
    const endMs = shortenedEndMs(block, index + 1)
    return endMs.ok ? timeFormatter.format(new Date(endMs.value)) : ''
  })

export const toManualBlockViews = (blocks: readonly ManualBlock[]): ManualBlockView[] =>
  blocks.map((block) => ({
    id: block.id,
    date: instantDateFormatter.format(block.startsAt),
    range: `${timeFormatter.format(block.startsAt)}–${timeFormatter.format(block.endsAt)}`,
    reason: block.reason,
    endsAtIso: block.endsAt.toISOString(),
    releaseEnds: releaseEndsOf(block),
  }))
