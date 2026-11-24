import type { RequestState } from '@/features/delinquency/domain/regularization'
import { CASE_STATE_LABELS } from '../../constants/case-state-labels'

export const caseDetailMessages = {
  title: 'Detalle de la morosidad',
  backToHistory: 'Volver al historial',
  loadError: 'No se pudo cargar el detalle de la morosidad.',
  retry: 'Reintentar',
  notFound: {
    title: 'Morosidad no encontrada',
    body: 'No existe una morosidad con ese identificador.',
  },
  loading: 'Cargando el detalle…',
  error: {
    title: 'No se pudo cargar el detalle',
    body: 'Hubo un problema al leer los datos. Inténtelo nuevamente.',
  },
  requests: {
    title: 'Solicitudes de regularización',
    empty: 'Esta morosidad no tiene solicitudes de regularización.',
    stateLabel: 'Estado de la solicitud: ',
    states: {
      pending_approval: 'Pendiente de aprobación',
      approved: 'Aprobada',
      rejected: 'Rechazada',
      replaced: 'Reemplazada',
    } as const satisfies Record<RequestState, string>,
    declaredAmount: 'Monto declarado',
    approvedAmount: 'Monto aprobado',
    rejectionReason: 'Motivo del rechazo',
    reviewedAt: 'Fecha de revisión',
    reference: 'Referencia',
  },
  clientFallback: 'Clienta sin nombre',
  appointmentMissing: 'Cita no disponible',
  appointmentUnavailable: 'No se pudo leer la cita asociada. El resto del detalle sí se muestra.',
  stateLabel: 'Estado: ',
  states: CASE_STATE_LABELS,
  labels: {
    originAmount: 'Monto de origen',
    balanceToday: 'Saldo de hoy',
    appointment: 'Cita asociada',
    detectedAt: 'Fecha de origen',
    decidedAt: 'Fecha de decisión',
    settledAt: 'Fecha en que se saldó',
    exceptionReason: 'Motivo de la excepción',
    exceptionAmount: 'Monto condonado',
  },
} as const
