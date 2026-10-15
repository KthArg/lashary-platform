import { err, isErr, ok, type Result } from '@/shared/result'
import { APPOINTMENT_DECISION } from '../domain/appointment-decision.constants'
import { normalizeDecisionReason } from '../domain/appointment-decision'
import type { AppointmentNotPending, InvalidDecisionReason } from '../domain/errors'
import { APPOINTMENT_ENTITY_TYPE, APPOINTMENT_REJECTED_ACTION } from './decide-appointment.constants'
import type {
  AppointmentDecisionRepository,
  DecidedAppointment,
  RecordAuditEvent,
} from './ports'

export type DecideAppointmentDeps = {
  appointments: AppointmentDecisionRepository
  recordAuditEvent: RecordAuditEvent
}

export type ApproveAppointmentInput = { appointmentId: string }

export type RejectAppointmentInput = {
  appointmentId: string
  actorId: string
  reason?: string
}

export type DecideAppointmentError = AppointmentNotPending | InvalidDecisionReason

// Solo una persona decide (DOM-012): nada aprueba ni rechaza por su cuenta.
export async function approveAppointment(
  deps: DecideAppointmentDeps,
  input: ApproveAppointmentInput,
): Promise<Result<DecidedAppointment, AppointmentNotPending>> {
  return deps.appointments.decide({
    appointmentId: input.appointmentId,
    decision: APPOINTMENT_DECISION.APPROVED,
    reason: null,
  })
}

// Rechazar libera el espacio (la base lo saca del constraint) y deja constancia en la bitácora.
// Si la bitácora falla el error se propaga: la decisión ya quedó guardada y falta su evento.
export async function rejectAppointment(
  deps: DecideAppointmentDeps,
  input: RejectAppointmentInput,
): Promise<Result<DecidedAppointment, DecideAppointmentError>> {
  const reason = normalizeDecisionReason(input.reason)
  if (isErr(reason)) return err(reason.error)

  const rejected = await deps.appointments.decide({
    appointmentId: input.appointmentId,
    decision: APPOINTMENT_DECISION.REJECTED,
    reason: reason.value,
  })
  if (isErr(rejected)) return rejected

  const audited = await deps.recordAuditEvent({
    actorId: input.actorId,
    action: APPOINTMENT_REJECTED_ACTION,
    entityType: APPOINTMENT_ENTITY_TYPE,
    entityId: input.appointmentId,
    payload: { reason: reason.value },
  })
  if (isErr(audited)) throw audited.error

  return ok(rejected.value)
}

