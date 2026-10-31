import { err, isErr, ok, type Result } from '@/shared/result'
import { APPOINTMENT_DECISION } from '../domain/appointment-decision.constants'
import { normalizeDecisionReason } from '../domain/appointment-decision'
import {
  auditNotRecorded,
  type AppointmentNotPending,
  type AppointmentScheduleChanged,
  type AuditNotRecorded,
  type InvalidDecisionReason,
  type StorageFailed,
} from '../domain/errors'
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

export type ApproveAppointmentInput = { appointmentId: string; seenStartsAtMs: number }

export type RejectAppointmentInput = {
  appointmentId: string
  actorId: string
  reason?: string
}

export type ApproveAppointmentError = AppointmentNotPending | AppointmentScheduleChanged | StorageFailed

export type DecideAppointmentError =
  | ApproveAppointmentError
  | InvalidDecisionReason
  | AuditNotRecorded

export async function approveAppointment(
  deps: DecideAppointmentDeps,
  input: ApproveAppointmentInput,
): Promise<Result<DecidedAppointment, ApproveAppointmentError>> {
  return deps.appointments.decide({
    appointmentId: input.appointmentId,
    decision: APPOINTMENT_DECISION.APPROVED,
    reason: null,
    expectedStartsAtMs: input.seenStartsAtMs,
  })
}

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
  if (isErr(audited)) return err(auditNotRecorded())

  return ok(rejected.value)
}
