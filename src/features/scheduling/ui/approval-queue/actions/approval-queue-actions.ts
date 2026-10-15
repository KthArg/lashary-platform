'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_PORTAL_ROUTES, requireAdminSession } from '@/features/auth'
import { record } from '@/features/audit'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { approveAppointment, rejectAppointment } from '../../../application/decide-appointment'
import { listPendingAppointments } from '../../../application/list-pending-appointments'
import { createSupabaseAppointmentDecisionRepository } from '../../../db/appointment-decision-repository'
import { createSupabasePendingAppointmentsRepository } from '../../../db/pending-appointments-repository'
import { APPROVAL_QUEUE_ERRORS } from '../constants/approval-queue.constants'
import type { RecordAuditEvent } from '../../../application/ports'
import type { DecideAppointmentError } from '../../../application/decide-appointment'
import type {
  DecideAppointmentResult,
  ListPendingAppointmentsResult,
} from '../types/approval-queue-action-results'

const DECISION_ERROR_MESSAGES: Record<(DecideAppointmentError | { code: 'unexpected' })['code'], string> = {
  SCHEDULING_APPOINTMENT_NOT_PENDING: APPROVAL_QUEUE_ERRORS.notPending,
  SCHEDULING_INVALID_DECISION_REASON: APPROVAL_QUEUE_ERRORS.reasonTooLong,
  unexpected: APPROVAL_QUEUE_ERRORS.decisionFailed,
}

export async function listPendingAppointmentsAction(): Promise<ListPendingAppointmentsResult> {
  await requireAdminSession()
  try {
    const repository = createSupabasePendingAppointmentsRepository(await createClient())
    return { ok: true, appointments: await listPendingAppointments(repository) }
  } catch {
    return { ok: false, error: APPROVAL_QUEUE_ERRORS.loadFailed }
  }
}

export async function approveAppointmentAction(appointmentId: string): Promise<DecideAppointmentResult> {
  await requireAdminSession()
  try {
    const appointments = createSupabaseAppointmentDecisionRepository(await createClient())
    const result = await approveAppointment({ appointments, recordAuditEvent: record }, { appointmentId })
    if (isErr(result)) return { ok: false, error: DECISION_ERROR_MESSAGES[result.error.code] }
  } catch {
    return { ok: false, error: DECISION_ERROR_MESSAGES.unexpected }
  }

  revalidatePath(ADMIN_PORTAL_ROUTES.citas)
  return { ok: true }
}

// El actor sale de la sesión del servidor, nunca de lo que mande el cliente (SEC-005).
export async function rejectAppointmentAction(
  appointmentId: string,
  reason?: string,
): Promise<DecideAppointmentResult> {
  const session = await requireAdminSession()
  let auditFailed = false
  const recordAuditEvent: RecordAuditEvent = async (event) => {
    try {
      const recorded = await record(event)
      if (isErr(recorded)) auditFailed = true
      return recorded
    } catch (error) {
      auditFailed = true
      throw error
    }
  }

  try {
    const appointments = createSupabaseAppointmentDecisionRepository(await createClient())
    const result = await rejectAppointment(
      { appointments, recordAuditEvent },
      { appointmentId, actorId: session.user.id, reason },
    )
    if (isErr(result)) return { ok: false, error: DECISION_ERROR_MESSAGES[result.error.code] }
  } catch {
    // Si solo falló la bitácora la cita ya quedó rechazada: la cola debe dejar de mostrarla.
    if (auditFailed) revalidatePath(ADMIN_PORTAL_ROUTES.citas)
    return {
      ok: false,
      error: auditFailed ? APPROVAL_QUEUE_ERRORS.auditFailed : DECISION_ERROR_MESSAGES.unexpected,
    }
  }

  revalidatePath(ADMIN_PORTAL_ROUTES.citas)
  return { ok: true }
}
