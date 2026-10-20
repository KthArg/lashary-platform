import type { Result } from '@/shared/result'
import type { ReminderChannelKind, ReminderSnapshot } from '../domain/reminder'
import type { ChannelNotConfigured, ChannelSendFailed } from '../domain/errors'

export type RepositoryFailure = 'repository-failed'

// Lo que scheduling expone de una cita para armar y vigilar un recordatorio (ARCH-005: caso de
// uso público, nunca una consulta directa a scheduling_appointments).
export type AppointmentSnapshot = {
  appointmentId: string
  clientId: string
  startsAt: Date
  techniqueName: string
}

export type ReminderWindow = { from: Date; to: Date }

export interface SchedulingReadPort {
  // Citas activas (aprobadas/confirmadas) que empiezan dentro de la ventana.
  listActiveAppointmentsStartingWithin(window: ReminderWindow): Promise<Result<AppointmentSnapshot[], RepositoryFailure>>
  // null = la cita ya no está activa (cancelada, rechazada, completada, ausencia) o no existe.
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
  // No hace nada si ya existe un recordatorio (pendiente o no) para esa cita (idempotente).
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
