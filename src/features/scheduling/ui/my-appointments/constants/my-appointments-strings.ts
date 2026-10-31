export const BOOK_APPOINTMENT_PATH = '/portal/citas'

export const MY_APPOINTMENTS_PATH = `${BOOK_APPOINTMENT_PATH}/mis-citas`

export const myAppointmentsMessages = {
  title: 'Mis citas',
  subtitle: 'Tus próximas citas y el estado de cada una.',
  empty: 'No tenés citas próximas.',
  bookCta: 'Reservar una cita',
  accessDenied: 'Iniciá sesión como clienta para ver tus citas.',
  loadFailed: 'No pudimos cargar tus citas. Intentá de nuevo.',
  reload: 'Reintentar',
  loading: 'Cargando tus citas…',
  listLabel: 'Próximas citas',
  heldSchedule: (slot: string) =>
    `Pediste cambiar el horario. Mientras la administradora lo revisa, tu horario aprobado sigue siendo el ${slot}; si no acepta el cambio, la cita se queda ahí.`,
  status: {
    pending_approval: 'Pendiente de aprobación',
    approved: 'Aprobada',
    confirmed: 'Confirmada',
  },
  error: {
    title: 'No se pudieron cargar tus citas',
    body: 'Ocurrió un error al preparar la pantalla.',
    retry: 'Reintentar',
  },
} as const
