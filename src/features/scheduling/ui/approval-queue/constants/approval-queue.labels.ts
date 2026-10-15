export const APPROVAL_QUEUE_LABELS = {
  sectionTitle: 'Gestión de Citas',
  sectionSubtitle: 'Cada cita pendiente ocupa su espacio hasta que la apruebes o la rechaces.',
  listTitle: 'Pendientes de aprobación',
  loading: 'Cargando las citas pendientes…',
  empty: 'No hay citas pendientes de aprobación.',
  retry: 'Reintentar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  confirmReject: 'Confirmar rechazo',
  cancelReject: 'Cancelar',
  reasonLabel: 'Motivo del rechazo (opcional)',
  saving: 'Guardando…',
} as const

export const APPROVAL_QUEUE_ARIA = {
  list: 'Citas pendientes de aprobación',
  approve: (slot: string) => `Aprobar la cita del ${slot}`,
  reject: (slot: string) => `Rechazar la cita del ${slot}`,
} as const

export const APPROVAL_QUEUE_FORMAT = {
  locale: 'es-CR',
  timeZone: 'America/Costa_Rica',
  slotSeparator: ' · ',
  rangeSeparator: ' – ',
} as const

export const REASON_FIELD_ROWS = 3
