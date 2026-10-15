import { MAX_DECISION_REASON_LENGTH } from '../../../domain/appointment-decision.constants'

export const APPROVAL_QUEUE_ERRORS = {
  loadFailed: 'No se pudieron cargar las citas pendientes.',
  notPending: 'La cita ya no está pendiente: otra persona la decidió o ya no existe.',
  reasonTooLong: `El motivo no puede superar los ${MAX_DECISION_REASON_LENGTH} caracteres.`,
  decisionFailed: 'No se pudo guardar la decisión. Inténtalo de nuevo.',
  auditFailed: 'La cita se rechazó, pero no se pudo registrar en la bitácora. Avisa a soporte.',
} as const
