import type { AppointmentStatus, DepositStatus } from '@/features/clients/domain/history/appointment-history.types'
import type { NoteProblem } from '@/features/clients/domain/notes/note-errors'
import { NOTE_LIMITS } from '@/features/clients/domain/notes/note-limits'

export const NOTE_PROBLEM_MESSAGES: Record<NoteProblem, string> = {
  'note-empty': 'Escribe la anotación antes de guardarla.',
  'note-too-long': `La anotación no puede pasar de ${NOTE_LIMITS.bodyMaxLength} caracteres.`,
}

export const NOTE_ERROR_MESSAGES = {
  appointmentNotOfClient: 'Esa cita no es de esta clienta.',
  noteNotFound: 'Esa anotación ya no existe. Recarga la página.',
  invalidTarget: 'No encontramos esa cita o anotación. Recarga la página.',
  storageFailed: 'No se pudo guardar el cambio en la anotación. Intenta de nuevo.',
} as const

export const NOTE_LABELS = {
  empty: 'Sin anotaciones',
  add: 'Agregar anotación',
  newField: 'Nueva anotación',
  editField: 'Editar anotación',
  edit: 'Editar',
  editButton: (position: number, total: number, createdAt: string) =>
    `Editar la anotación ${position} de ${total}, del ${createdAt}`,
  remove: 'Eliminar',
  removeButton: (position: number, total: number, createdAt: string) =>
    `Eliminar la anotación ${position} de ${total}, del ${createdAt}`,
  save: 'Guardar',
  saving: 'Guardando…',
  cancel: 'Cancelar',
  created: (date: string) => `Creada ${date}`,
  edited: (date: string) => `Editada ${date}`,
  confirmTitle: '¿Eliminar esta anotación?',
  confirmMessage: 'Se borra para siempre y no se puede recuperar.',
} as const

export const HISTORY_ERROR_MESSAGES = {
  clientNotFound: 'No encontramos a esta clienta.',
  historyUnavailable: 'No se pudo cargar el historial de citas. Intenta de nuevo.',
} as const

export const HISTORY_LABELS = {
  title: 'Historial de citas',
  loading: 'Cargando historial de citas…',
  empty: 'Esta clienta todavía no tiene citas.',
  retry: 'Reintentar',
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
