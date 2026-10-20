export const BOOKING_CONFIRM_PATH = '/portal/citas/calendario/confirmar'

export const PORTAL_CITAS_PATH = '/portal/citas'

export const CANCELLATION_WINDOW_HOURS = 48

export const MAX_CONFIRM_SERVICES = 100

export const bookingConfirmMessages = {
  title: 'Revisá tu reserva',
  subtitle: 'Confirmá que los datos son correctos antes de reservar.',
  serviceLabel: 'Servicio',
  whenLabel: 'Fecha y hora',
  durationLabel: 'Duración',
  priceLabel: 'Precio',
  depositLabel: 'Anticipo',
  noDeposit: 'Sin anticipo',
  duration: (minutes: number) => `${minutes} min`,
  service: (name: string, isFirstTime: boolean) => `${name} — ${isFirstTime ? 'primera vez' : 'retoque'}`,
  depositNotice: (hours: number) =>
    `El anticipo se pierde si cancelás con menos de ${hours} horas de anticipación o si no asistís a la cita.`,
  changeSlot: 'Elegir otro horario',
  confirm: 'Confirmar reserva',
  booking: 'Reservando…',
  bookedTitle: 'Tu reserva fue enviada',
  backToCitas: 'Ir a mis citas',
  accessDenied: 'Iniciá sesión como clienta para reservar una cita.',
  invalid: 'Ese horario no es válido. Elegí uno de nuevo.',
  unavailable: 'Ese servicio ya no está disponible. Elegí otro.',
  loading: 'Preparando tu reserva…',
  clientNotRegistered: 'Completá tu perfil de clienta para poder reservar.',
  delinquency: 'Tenés un pago pendiente: no podés reservar hasta regularizarlo.',
  storageFailed: 'No pudimos guardar tu reserva. Intentá de nuevo.',
  pendingApproval: 'Tu reserva quedó pendiente de aprobación de la administradora.',
  error: {
    title: 'No se pudo preparar tu reserva',
    body: 'Ocurrió un error al calcular el resumen.',
    retry: 'Reintentar',
  },
} as const
