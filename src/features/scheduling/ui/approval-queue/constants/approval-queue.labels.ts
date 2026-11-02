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

export const APPROVAL_QUEUE_CLIENT = {
  noClient: 'Sin clienta asociada',
} as const

export const APPROVAL_QUEUE_CHOICE = {
  chose: {
    retouchButDetectedFirstTime: 'Eligió retoque, pero el sistema no encuentra una cita anterior con esta técnica. Verificá antes de aprobar.',
    firstTimeButDetectedRetouch: 'Eligió primera vez, pero el sistema encontró una cita anterior con esta técnica. Verificá antes de aprobar.',
  },
} as const

export const APPROVAL_QUEUE_HELD = {
  note: (slot: string) =>
    `La clienta pidió cambiar el horario. Su horario aprobado es el ${slot}: si rechazás el cambio, la cita vuelve a ese horario.`,
} as const

export const APPROVAL_QUEUE_ARIA = {
  list: 'Citas pendientes de aprobación',
  approve: (slot: string) => `Aprobar la cita del ${slot}`,
  reject: (slot: string) => `Rechazar la cita del ${slot}`,
} as const

export const REASON_FIELD_ROWS = 3
