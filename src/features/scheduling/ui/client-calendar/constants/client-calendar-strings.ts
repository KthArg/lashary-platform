export const CLIENT_CALENDAR_PATH = '/portal/citas/calendario'

export const CALENDAR_PARAMS = { service: 'servicio', date: 'fecha' } as const

export const MAX_CALENDAR_SERVICES = 100

export const clientCalendarMessages = {
  title: 'Elegí tu espacio',
  subtitle: 'Elegí el servicio y mirá los espacios libres de cada día.',
  serviceLabel: 'Servicio',
  servicePlaceholder: 'Elegí un servicio',
  serviceOption: (name: string, isFirstTime: boolean, minutes: number) =>
    `${name} — ${isFirstTime ? 'primera vez' : 'retoque'} (${minutes} min)`,
  showSlots: 'Ver espacios',
  dayNavigation: 'Cambiar de día',
  previousDay: 'Día anterior',
  previousDayShort: 'Anterior',
  previousArrow: '←',
  nextDay: 'Día siguiente',
  nextDayShort: 'Siguiente',
  nextArrow: '→',
  accessDenied: 'Iniciá sesión como clienta para ver los espacios disponibles.',
  slotsLegend: 'Espacios del día',
  free: 'Libre',
  busy: 'Ocupado',
  noServices: 'Todavía no hay servicios para agendar. Volvé a intentarlo más tarde.',
  chooseService: 'Elegí un servicio para ver los espacios disponibles.',
  noSlots: 'No hay espacios disponibles este día. Probá con otro día.',
  invalid: 'No pudimos calcular los espacios de ese día. Elegí otro día o servicio.',
  loading: 'Cargando los espacios…',
  error: {
    title: 'No se pudo cargar el calendario',
    body: 'Ocurrió un error al consultar la disponibilidad.',
    retry: 'Reintentar',
  },
} as const
