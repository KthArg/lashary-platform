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
import {
  APPROVAL_QUEUE_ERRORS,
  DECISION_SAVED_ERROR_CODE,
  SCHEDULE_CHANGED_ERROR_CODE,
} from '../constants/approval-queue.constants'
import { getDecisionErrorMessage } from '../utils/decision-error-message'
import type {
  DecideAppointmentResult,
  ListPendingAppointmentsResult,
} from '../types/approval-queue-action-results'

export async function listPendingAppointmentsAction(): Promise<ListPendingAppointmentsResult> {
  await requireAdminSession()
  const repository = createSupabasePendingAppointmentsRepository(await createClient())
  const pending = await listPendingAppointments(repository)
  if (isErr(pending)) return { ok: false, error: APPROVAL_QUEUE_ERRORS.loadFailed }

  return { ok: true, appointments: pending.value }
}

export async function approveAppointmentAction(
  appointmentId: string,
  seenStartsAtMs: number,
): Promise<DecideAppointmentResult> {
  await requireAdminSession()
  const appointments = createSupabaseAppointmentDecisionRepository(await createClient())
  const result = await approveAppointment({ appointments, recordAuditEvent: record }, { appointmentId, seenStartsAtMs })
  if (isErr(result)) {
    if (result.error.code === SCHEDULE_CHANGED_ERROR_CODE) revalidatePath(ADMIN_PORTAL_ROUTES.citas)
    return { ok: false, error: getDecisionErrorMessage(result.error) }
  }

  revalidatePath(ADMIN_PORTAL_ROUTES.citas)
  return { ok: true }
}

export async function rejectAppointmentAction(
  appointmentId: string,
  reason?: string,
): Promise<DecideAppointmentResult> {
  const session = await requireAdminSession()
  const appointments = createSupabaseAppointmentDecisionRepository(await createClient())
  const result = await rejectAppointment(
    { appointments, recordAuditEvent: record },
    { appointmentId, actorId: session.user.id, reason },
  )
  if (isErr(result)) {
    if (result.error.code === DECISION_SAVED_ERROR_CODE) revalidatePath(ADMIN_PORTAL_ROUTES.citas)
    return { ok: false, error: getDecisionErrorMessage(result.error) }
  }

  revalidatePath(ADMIN_PORTAL_ROUTES.citas)
  return { ok: true }
}
