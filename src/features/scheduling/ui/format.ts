const INSTANT_FORMATTER = new Intl.DateTimeFormat('es-CR', {
  timeZone: 'America/Costa_Rica',
  dateStyle: 'medium',
  timeStyle: 'short',
})

const HH_MM_LENGTH = 5

export function formatTime(value: string): string {
  return value.slice(0, HH_MM_LENGTH)
}

export function formatInstant(value: Date): string {
  return INSTANT_FORMATTER.format(value)
}

export function formatClosedDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
