import { STUDIO_TIME_ZONE } from '@/shared/studio-time'
import type { WeeklyBlock } from '../../../domain/weekly-availability'
import type { ClosedDate } from '../../../domain/closed-dates'
import type { ManualBlock } from '../../../domain/manual-blocks'
import { schedulingMessages } from '../../messages'

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

export type ManualBlockView = { id: string; date: string; range: string; reason: string | null }

export const toManualBlockViews = (blocks: readonly ManualBlock[]): ManualBlockView[] =>
  blocks.map((block) => ({
    id: block.id,
    date: instantDateFormatter.format(block.startsAt),
    range: `${timeFormatter.format(block.startsAt)}–${timeFormatter.format(block.endsAt)}`,
    reason: block.reason,
  }))
