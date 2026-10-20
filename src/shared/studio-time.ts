// Hora del estudio. La disponibilidad se configura en horas de pared de la zona del estudio y
// los instantes se guardan en UTC (DOM-003): estas funciones puras hacen el puente, sin reglas de
// negocio (ARCH-007). Reciben el instante como parámetro; nunca leen el reloj (DOM-004).

export const STUDIO_TIME_ZONE = 'America/Costa_Rica'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

// Fecha de calendario real con formato AAAA-MM-DD (rechaza 2026-02-30).
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

// Fecha de calendario (AAAA-MM-DD) que marca el estudio en ese instante.
export function studioDateOf(instant: Date): string {
  const { year, month, day } = zonedParts(instant)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// Instante UTC de una fecha y hora de pared del estudio. Calcula la diferencia de la zona en
// ese momento, así que no asume un desfase fijo.
export function studioLocalToUtc(date: string, minuteOfDay: number): Date {
  const [year, month, day] = date.split('-').map(Number)
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minuteOfDay)
  const seen = zonedParts(new Date(asIfUtc))
  const seenAsUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute)
  return new Date(asIfUtc - (seenAsUtc - asIfUtc))
}
