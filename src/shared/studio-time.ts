export const STUDIO_TIME_ZONE = 'America/Costa_Rica'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isCalendarDate(value: string): boolean {
  const match = ISO_DATE.exec(value)
  if (!match) return false
  const [year, month, day] = match.slice(1).map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

const MS_PER_DAY = 86_400_000

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day) + days * MS_PER_DAY).toISOString().slice(0, 10)
}

function zonedParts(instant: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant)
  return Object.fromEntries(
    parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]),
  )
}

export function studioDateOf(instant: Date): string {
  const { year, month, day } = zonedParts(instant)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Calcula el desfase de la zona en ese instante; no asume uno fijo
export function studioLocalToUtc(date: string, minuteOfDay: number): Date {
  const [year, month, day] = date.split('-').map(Number)
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minuteOfDay)
  const seen = zonedParts(new Date(asIfUtc))
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute)
  return new Date(asIfUtc - (seenAsUtc - asIfUtc))
}

const DATETIME_LOCAL_INPUT = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/

export function parseStudioDateTimeInput(value: string): Date | null {
  const match = DATETIME_LOCAL_INPUT.exec(value)
  if (!match) return null
  const [, date, hour, minute] = match
  if (!isCalendarDate(date)) return null
  const minuteOfDay = Number(hour) * 60 + Number(minute)
  if (minuteOfDay < 0 || minuteOfDay >= 24 * 60) return null
  return studioLocalToUtc(date, minuteOfDay)
}

export function studioDateTimeInputValue(instant: Date): string {
  const { year, month, day, hour, minute } = zonedParts(instant)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const studioDateTimeFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatStudioDateTime(instant: Date): string {
  return studioDateTimeFormatter.format(instant)
}

const studioDateFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: STUDIO_TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// Para fechas sin una hora que importe (ej. la fecha estimada de re-aplicación, US-NOT-05): evita
// mostrar una hora heredada del cálculo que no significa nada para la clienta.
export function formatStudioDate(instant: Date): string {
  return studioDateFormatter.format(instant)
}
