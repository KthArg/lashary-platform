import { APPOINTMENT_DISPLAY_FORMAT } from '../constants/appointment-display.constants'

const dateFormatter = new Intl.DateTimeFormat(APPOINTMENT_DISPLAY_FORMAT.locale, {
  dateStyle: 'full',
  timeZone: APPOINTMENT_DISPLAY_FORMAT.timeZone,
})

const timeFormatter = new Intl.DateTimeFormat(APPOINTMENT_DISPLAY_FORMAT.locale, {
  timeStyle: 'short',
  timeZone: APPOINTMENT_DISPLAY_FORMAT.timeZone,
})

export function formatAppointmentSlot(startsAtMs: number, endsAtMs: number): string {
  const day = dateFormatter.format(startsAtMs)
  const from = timeFormatter.format(startsAtMs)
  const until = timeFormatter.format(endsAtMs)
  return `${day}${APPOINTMENT_DISPLAY_FORMAT.slotSeparator}${from}${APPOINTMENT_DISPLAY_FORMAT.rangeSeparator}${until}`
}
