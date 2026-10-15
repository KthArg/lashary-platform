import { APPROVAL_QUEUE_FORMAT } from '../constants/approval-queue.labels'

const dateFormatter = new Intl.DateTimeFormat(APPROVAL_QUEUE_FORMAT.locale, {
  dateStyle: 'full',
  timeZone: APPROVAL_QUEUE_FORMAT.timeZone,
})

const timeFormatter = new Intl.DateTimeFormat(APPROVAL_QUEUE_FORMAT.locale, {
  timeStyle: 'short',
  timeZone: APPROVAL_QUEUE_FORMAT.timeZone,
})

export function formatAppointmentSlot(startsAtMs: number, endsAtMs: number): string {
  const day = dateFormatter.format(startsAtMs)
  const from = timeFormatter.format(startsAtMs)
  const until = timeFormatter.format(endsAtMs)
  return `${day}${APPROVAL_QUEUE_FORMAT.slotSeparator}${from}${APPROVAL_QUEUE_FORMAT.rangeSeparator}${until}`
}
