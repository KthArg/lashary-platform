export const NOTIFICATIONS_ERROR_CODES = {
  invalidReminder: 'NOTIFICATIONS_REMINDER_INVALID',
  channelNotConfigured: 'NOTIFICATIONS_CHANNEL_NOT_CONFIGURED',
  channelSendFailed: 'NOTIFICATIONS_CHANNEL_SEND_FAILED',
  contactMissing: 'NOTIFICATIONS_CONTACT_MISSING',
  inboxStorageFailed: 'NOTIFICATIONS_INBOX_STORAGE_FAILED',
} as const

type NotificationsErrorCode = (typeof NOTIFICATIONS_ERROR_CODES)[keyof typeof NOTIFICATIONS_ERROR_CODES]

function hasCode<T extends { code: NotificationsErrorCode }>(
  error: unknown,
  code: T['code'],
): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface ReminderValidationError {
  readonly code: typeof NOTIFICATIONS_ERROR_CODES.invalidReminder
  readonly message: string
  readonly problems: string[]
}

export function reminderValidationError(problems: string[]): ReminderValidationError {
  return { code: NOTIFICATIONS_ERROR_CODES.invalidReminder, message: `recordatorio inválido: ${problems.join('; ')}`, problems }
}

export const isReminderValidationError = (error: unknown): error is ReminderValidationError =>
  hasCode<ReminderValidationError>(error, NOTIFICATIONS_ERROR_CODES.invalidReminder)

export interface ChannelNotConfigured {
  readonly code: typeof NOTIFICATIONS_ERROR_CODES.channelNotConfigured
  readonly message: string
  readonly channel: string
}

export function channelNotConfigured(channel: string): ChannelNotConfigured {
  return { code: NOTIFICATIONS_ERROR_CODES.channelNotConfigured, message: `canal sin configurar: ${channel}`, channel }
}

export const isChannelNotConfigured = (error: unknown): error is ChannelNotConfigured =>
  hasCode<ChannelNotConfigured>(error, NOTIFICATIONS_ERROR_CODES.channelNotConfigured)

export interface ChannelSendFailed {
  readonly code: typeof NOTIFICATIONS_ERROR_CODES.channelSendFailed
  readonly message: string
  readonly channel: string
  readonly cause: string
}

export function channelSendFailed(channel: string, cause: string): ChannelSendFailed {
  return { code: NOTIFICATIONS_ERROR_CODES.channelSendFailed, message: `envío falló por ${channel}: ${cause}`, channel, cause }
}

export const isChannelSendFailed = (error: unknown): error is ChannelSendFailed =>
  hasCode<ChannelSendFailed>(error, NOTIFICATIONS_ERROR_CODES.channelSendFailed)

export interface ContactMissing {
  readonly code: typeof NOTIFICATIONS_ERROR_CODES.contactMissing
  readonly message: string
  readonly clientId: string
}

export function contactMissing(clientId: string): ContactMissing {
  return { code: NOTIFICATIONS_ERROR_CODES.contactMissing, message: `sin contacto para el cliente ${clientId}`, clientId }
}

export const isContactMissing = (error: unknown): error is ContactMissing =>
  hasCode<ContactMissing>(error, NOTIFICATIONS_ERROR_CODES.contactMissing)

export interface InboxStorageFailed {
  readonly code: typeof NOTIFICATIONS_ERROR_CODES.inboxStorageFailed
  readonly message: string
  readonly cause: string
}

export function inboxStorageFailed(cause: string): InboxStorageFailed {
  return { code: NOTIFICATIONS_ERROR_CODES.inboxStorageFailed, message: `la bandeja no respondió: ${cause}`, cause }
}

export const isInboxStorageFailed = (error: unknown): error is InboxStorageFailed =>
  hasCode<InboxStorageFailed>(error, NOTIFICATIONS_ERROR_CODES.inboxStorageFailed)
