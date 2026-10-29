import { ok, err, type Result } from '@/shared/result'
import { addCalendarDays, isCalendarDate, studioLocalToUtc } from '@/shared/studio-time'
import { dailyAgendaInvalid, type DailyAgendaInvalid } from './availability-errors'
import {
  DAILY_AGENDA_LIMIT,
  DEPOSIT_PAYMENT_STATUS,
  MS_PER_MINUTE,
  type AgendaAppointmentStatus,
  type DepositPaymentStatus,
} from './daily-agenda.constants'

export interface AgendaDayRange {
  readonly fromMs: number
  readonly untilMs: number
}

// Cita tal como la entrega el repositorio. Los campos del snapshot son null en las citas
// anteriores a US-AGE-05, que no guardaron técnica ni anticipo.
export interface AgendaAppointment {
  readonly id: string
  readonly status: AgendaAppointmentStatus
  readonly startsAtMs: number
  readonly endsAtMs: number
  readonly clientId: string | null
  readonly clientName: string | null
  readonly techniqueName: string | null
  readonly isFirstTime: boolean | null
  readonly depositRequired: number | null
  readonly depositRegistered: number | null
}

export interface AgendaEntry {
  readonly id: string
  readonly status: AgendaAppointmentStatus
  readonly startsAtMs: number
  readonly endsAtMs: number
  readonly durationMin: number
  readonly clientId: string | null
  readonly clientName: string | null
  readonly techniqueName: string | null
  readonly isFirstTime: boolean | null
  readonly paymentStatus: DepositPaymentStatus | null
}

// El día de la agenda es el día de pared del estudio (DOM-003): [00:00 de la fecha, 00:00 de la siguiente).
export function studioDayRange(date: string): Result<AgendaDayRange, DailyAgendaInvalid> {
  if (!isCalendarDate(date)) return err(dailyAgendaInvalid())
  return ok({
    fromMs: studioLocalToUtc(date, 0).getTime(),
    untilMs: studioLocalToUtc(addCalendarDays(date, 1), 0).getTime(),
  })
}

export function derivePaymentStatus(
  depositRequired: number | null,
  depositRegistered: number | null,
): DepositPaymentStatus | null {
  if (depositRequired === null || depositRegistered === null) return null
  if (depositRequired === 0) return DEPOSIT_PAYMENT_STATUS.NOT_REQUIRED
  if (depositRegistered >= depositRequired) return DEPOSIT_PAYMENT_STATUS.COVERED
  return depositRegistered > 0 ? DEPOSIT_PAYMENT_STATUS.PARTIAL : DEPOSIT_PAYMENT_STATUS.UNPAID
}

export function toAgendaEntry(appointment: AgendaAppointment): AgendaEntry {
  return {
    id: appointment.id,
    status: appointment.status,
    startsAtMs: appointment.startsAtMs,
    endsAtMs: appointment.endsAtMs,
    durationMin: Math.round((appointment.endsAtMs - appointment.startsAtMs) / MS_PER_MINUTE),
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    techniqueName: appointment.techniqueName,
    isFirstTime: appointment.isFirstTime,
    paymentStatus: derivePaymentStatus(appointment.depositRequired, appointment.depositRegistered),
  }
}

const REJECTED_STATUS: AgendaAppointmentStatus = 'rejected'

// A la misma hora, la rechazada va después de la que sí se atiende.
const rejectedLast = (entry: AgendaEntry): number => (entry.status === REJECTED_STATUS ? 1 : 0)

export function buildAgenda(appointments: readonly AgendaAppointment[]): AgendaEntry[] {
  return appointments
    .map(toAgendaEntry)
    .sort(
      (left, right) =>
        left.startsAtMs - right.startsAtMs || rejectedLast(left) - rejectedLast(right) || left.id.localeCompare(right.id),
    )
}

export interface DailyAgendaEntries {
  readonly entries: AgendaEntry[]
  readonly isTruncated: boolean
}

// Pinta hasta DAILY_AGENDA_LIMIT citas y dice si quedaron otras fuera.
export function limitAgenda(appointments: readonly AgendaAppointment[]): DailyAgendaEntries {
  return {
    entries: buildAgenda(appointments).slice(0, DAILY_AGENDA_LIMIT),
    isTruncated: appointments.length > DAILY_AGENDA_LIMIT,
  }
}
