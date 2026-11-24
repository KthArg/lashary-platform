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
