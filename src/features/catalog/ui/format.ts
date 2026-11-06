const colones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

export const formatColones = (value: number): string => colones.format(value)

const dateTime = new Intl.DateTimeFormat('es-CR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Costa_Rica',
})

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso))
