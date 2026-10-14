import { APP_UTC_OFFSET } from '@/shared/locale'

export function parseCostaRicaLocalDateTime(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return new Date(`${withSeconds}${APP_UTC_OFFSET}`)
}
