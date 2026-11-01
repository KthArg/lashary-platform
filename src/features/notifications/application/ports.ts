import type { Result } from '@/shared/result'
import type { ReminderChannelKind, ReminderSnapshot } from '../domain/reminder'
import type { InboxNotice } from '../domain/inbox-notice'
import type { ChannelNotConfigured, ChannelSendFailed, InboxStorageFailed } from '../domain/errors'

export type RepositoryFailure = 'repository-failed'

export type AppointmentSnapshot = {
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
}

export type ReminderWindow = { from: Date; to: Date }

export interface SchedulingReadPort {
  listActiveAppointmentsStartingWithin(window: ReminderWindow): Promise<Result<AppointmentSnapshot[], RepositoryFailure>>
  getAppointmentSnapshot(appointmentId: string): Promise<Result<AppointmentSnapshot | null, RepositoryFailure>>
}

export interface SchedulingMaintenancePort {
  expireUndecidedReschedules(): Promise<Result<number, RepositoryFailure>>
}

export type ContactInfo = { phone: string; email: string }

export interface ClientContactPort {
  getContact(clientId: string): Promise<Result<ContactInfo | null, RepositoryFailure>>
}

export type ReminderUpsert = {
  id: string
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
  sendAt: Date
}

export type ReminderReschedule = { appointmentId: string; startsAt: Date; techniqueName: string; sendAt: Date }

export type InsertOutcome = { inserted: boolean }

export interface ReminderRepository {
  insertIfAbsent(reminder: ReminderUpsert): Promise<Result<InsertOutcome, RepositoryFailure>>
  listPending(): Promise<Result<ReminderSnapshot[], RepositoryFailure>>
  reschedulePending(reschedule: ReminderReschedule): Promise<Result<void, RepositoryFailure>>
  cancelPending(appointmentId: string): Promise<Result<void, RepositoryFailure>>
  claimDuePending(now: Date): Promise<Result<ReminderSnapshot[], RepositoryFailure>>
  releaseExpiredClaims(now: Date): Promise<Result<ReminderSnapshot[], RepositoryFailure>>
  releaseToPending(id: string): Promise<Result<void, RepositoryFailure>>
  markSent(id: string, channel: ReminderChannelKind, sentAt: Date): Promise<Result<void, RepositoryFailure>>
  markRetry(id: string, attempts: number, error: string): Promise<Result<void, RepositoryFailure>>
  markExhausted(id: string, attempts: number, error: string): Promise<Result<void, RepositoryFailure>>
}

export type NoticeNotFound = 'notice-not-found'

export type SetReadOutcome = { updated: boolean }

export type InboxPageRequest = { offset: number; limit: number }

export type InboxPage = { notices: InboxNotice[]; hasMore: boolean }

export interface InboxRepository {
  listRecent(page: InboxPageRequest): Promise<Result<InboxPage, InboxStorageFailed>>
  countUnread(): Promise<Result<number, InboxStorageFailed>>
  setReadAt(id: string, readAt: Date | null): Promise<Result<SetReadOutcome, InboxStorageFailed>>
}

export type ChannelSendInput ={ reminderId: string; contact: ContactInfo; message: string; templateVariables: string[] }

export interface NotificationChannel {
  readonly kind: ReminderChannelKind
  send(input: ChannelSendInput): Promise<Result<void, ChannelSendFailed | ChannelNotConfigured>>
}
