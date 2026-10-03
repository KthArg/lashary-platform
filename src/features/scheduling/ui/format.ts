import { APP_LOCALE, APP_TIME_ZONE } from '@/shared/locale'
import { parseCostaRicaLocalDateTime } from './parse-local-datetime'

const TIME_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIME_ZONE, timeStyle: 'short' })

const DATE_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, { timeZone: APP_TIME_ZONE, dateStyle: 'medium' })

const INSTANT_FORMATTER = new Intl.DateTimeFormat(APP_LOCALE, {
  timeZone: APP_TIME_ZONE,
  dateStyle: 'medium',
  timeStyle: 'short',
})

const REFERENCE_DATE = '2000-01-01'
const HH_MM_LENGTH = 5

export function formatTime(value: string): string {
  return TIME_FORMATTER.format(parseCostaRicaLocalDateTime(`${REFERENCE_DATE}T${value.slice(0, HH_MM_LENGTH)}`))
}

export function formatInstant(value: Date): string {
  return INSTANT_FORMATTER.format(value)
}

export function formatClosedDate(value: string): string {
  return DATE_FORMATTER.format(parseCostaRicaLocalDateTime(`${value}T00:00`))
}
