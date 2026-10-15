import type { DecideAppointmentError } from '../../../application/decide-appointment'
import { MAX_DECISION_REASON_LENGTH } from '../../../domain/appointment-decision.constants'

export const APPROVAL_QUEUE_ERRORS = {
  loadFailed: 'No se pudieron cargar las citas pendientes.',
  notPending: 'La cita ya no está pendiente: otra persona la decidió o ya no existe.',
  reasonTooLong: `El motivo no puede superar los ${MAX_DECISION_REASON_LENGTH} caracteres.`,
  decisionFailed: 'No se pudo guardar la decisión. Inténtalo de nuevo.',
  auditFailed: 'La cita se rechazó, pero no se pudo registrar en la bitácora. Avisa a soporte.',
} as const

export const DECISION_SAVED_ERROR_CODE = 'SCHEDULING_AUDIT_NOT_RECORDED'

export const DECISION_ERROR_MESSAGES: Record<DecideAppointmentError['code'], string> = {
  SCHEDULING_APPOINTMENT_NOT_PENDING: APPROVAL_QUEUE_ERRORS.notPending,
  SCHEDULING_INVALID_DECISION_REASON: APPROVAL_QUEUE_ERRORS.reasonTooLong,
  SCHEDULING_STORAGE_FAILED: APPROVAL_QUEUE_ERRORS.decisionFailed,
  SCHEDULING_AUDIT_NOT_RECORDED: APPROVAL_QUEUE_ERRORS.auditFailed,
}
