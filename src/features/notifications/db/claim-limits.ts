import { CHANNEL_SEND_TIMEOUT_MS } from '../channels/send-timeout'
import type { MessagePurpose } from '../application/ports'

export const CLAIM_TTL_MINUTES = 10
export const CYCLE_MAX_DURATION_SECONDS = 300

const CHANNELS_PER_MESSAGE = 2

export const PURPOSES_SENT_IN_SERIES = [
  'reschedule_outcome',
  'aftercare',
  'inactive_reminder',
  'appointment_confirmation',
  'reminder',
] as const satisfies readonly MessagePurpose[]

export const PURPOSES_SENT_IN_OWN_CYCLE = [
  'reapplication_reminder',
  'payment_reminder',
] as const satisfies readonly MessagePurpose[]

export const MESSAGE_KINDS_SENT_PER_CYCLE = PURPOSES_SENT_IN_SERIES.length
const MARGIN_KINDS = 1
export const MESSAGE_KINDS_PER_CYCLE = MESSAGE_KINDS_SENT_PER_CYCLE + MARGIN_KINDS

export const CLAIM_BATCH_SIZE = Math.floor(
  (CYCLE_MAX_DURATION_SECONDS * 1000) / (CHANNEL_SEND_TIMEOUT_MS * CHANNELS_PER_MESSAGE * MESSAGE_KINDS_PER_CYCLE),
)
