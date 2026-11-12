// Ruta de la pantalla de morosidades (`delinquency`). Se repite aquí porque el panel es un componente de cliente y el único
// punto de entrada de `delinquency` (ARCH-003) arrastra código de servidor; una prueba la compara con la original.
export const DELINQUENCY_REVIEW_PATH = '/admin/morosidades'

export const INBOX_ERRORS = {
  invalidInput: 'No se reconoce ese aviso. Recargá la página e intentá de nuevo.',
  notFound: 'Ese aviso ya no está disponible.',
  saveFailed: 'No se pudo guardar el cambio. Intentá de nuevo.',
  loadMoreFailed: 'No se pudieron cargar más avisos. Intentá de nuevo.',
} as const

export const INBOX_TEXTS = {
  title: 'Notificaciones',
  triggerLabel: (unreadCount: number) =>
    unreadCount === 0 ? 'Notificaciones, todas leídas' : `Notificaciones, ${unreadCount} sin leer`,
  close: 'Cerrar',
  bookingCreated: (clientName: string) => `${clientName} reservó una cita`,
  appointmentCancelled: (clientName: string) => `${clientName} canceló su cita`,
  appointmentRescheduled: (clientName: string) => `${clientName} cambió el horario de su cita`,
  delinquencyReview: (clientName: string) => `${clientName} tiene un pago sin registrar por revisar`,
  owes: (amount: string) => `Debe ${amount}`,
  reviewDelinquencies: 'Revisar morosidades',
  depositForfeited: (amount: string) => `Perdió el anticipo de ${amount}, según la política de cancelación`,
  depositKept: 'No perdió el anticipo',
  previousSchedule: (dateTime: string) => `Horario anterior: ${dateTime}`,
  newSchedule: (dateTime: string) => `Horario nuevo, por aprobar: ${dateTime}`,
  unread: 'Sin leer',
  markRead: 'Marcar como leída',
  markUnread: 'Marcar como no leída',
  empty: 'No tenés notificaciones. Cuando una clienta reserve, cancele o cambie una cita, o quede un pago sin registrar por revisar, el aviso aparece aquí.',
  loadFailed: 'No se pudieron cargar las notificaciones.',
  retry: 'Reintentar',
  loadMore: 'Ver más',
  loadingMore: 'Cargando…',
} as const
