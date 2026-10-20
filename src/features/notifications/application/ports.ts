import type { Result } from '@/shared/result'
import type { ReminderChannelKind, ReminderSnapshot } from '../domain/reminder'
import type { ChannelNotConfigured, ChannelSendFailed } from '../domain/errors'

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

export interface ReminderRepository {
  insertIfAbsent(reminder: ReminderUpsert): Promise<Result<void, RepositoryFailure>>
  listPending(): Promise<Result<ReminderSnapshot[], RepositoryFailure>>
  reschedulePending(reschedule: ReminderReschedule): Promise<Result<void, RepositoryFailure>>
  cancelPending(appointmentId: string): Promise<Result<void, RepositoryFailure>>
  listDuePending(now: Date): Promise<Result<ReminderSnapshot[], RepositoryFailure>>
  markSent(id: string, channel: ReminderChannelKind, sentAt: Date): Promise<Result<void, RepositoryFailure>>
  markRetry(id: string, attempts: number, error: string): Promise<Result<void, RepositoryFailure>>
  markExhausted(id: string, attempts: number, error: string): Promise<Result<void, RepositoryFailure>>
}

export type ChannelSendInput = { contact: ContactInfo; message: string }

export interface NotificationChannel {
  readonly kind: ReminderChannelKind
  send(input: ChannelSendInput): Promise<Result<void, ChannelSendFailed | ChannelNotConfigured>>
}
