import type { AppointmentStatus, DepositStatus } from '@/features/clients/domain/history/appointment-history.types'

export const HISTORY_ERROR_MESSAGES = {
  clientNotFound: 'No encontramos a esta clienta.',
  historyUnavailable: 'No se pudo cargar el historial de citas. Intenta de nuevo.',
} as const

export const HISTORY_LABELS = {
  title: 'Historial de citas',
  loading: 'Cargando historial de citas…',
  empty: 'Esta clienta todavía no tiene citas.',
  retry: 'Reintentar',
  pendingValue: 'Sin dato',
  unexpectedError: 'No se pudo cargar el historial de citas.',
} as const

export const HISTORY_TABLE_HEADERS = {
  date: 'Fecha',
  service: 'Servicio',
  status: 'Estado',
  payment: 'Pago',
  notes: 'Anotaciones',
} as const

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending_approval: 'Pendiente de aprobación',
  approved: 'Aprobada',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'Ausencia',
}

export const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  none: 'Sin anticipo',
  pending: 'Anticipo pendiente',
  registered: 'Anticipo registrado',
}

export const HISTORY_PAGINATION_TEXTS = {
  navLabel: 'Paginación del historial de citas',
  previous: 'Anterior',
  next: 'Siguiente',
  pageStatus: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
  totalCount: (total: number) => (total === 1 ? '1 cita' : `${total} citas`),
} as const
