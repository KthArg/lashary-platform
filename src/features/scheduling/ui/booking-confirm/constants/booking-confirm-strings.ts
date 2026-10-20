export const BOOKING_CONFIRM_PATH = '/portal/citas/calendario/confirmar'

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
  accessDenied: 'Iniciá sesión como clienta para reservar una cita.',
  invalid: 'Ese horario no es válido. Elegí uno de nuevo.',
  unavailable: 'Ese servicio ya no está disponible. Elegí otro.',
  loading: 'Preparando tu reserva…',
  error: {
    title: 'No se pudo preparar tu reserva',
    body: 'Ocurrió un error al calcular el resumen.',
    retry: 'Reintentar',
  },
} as const
