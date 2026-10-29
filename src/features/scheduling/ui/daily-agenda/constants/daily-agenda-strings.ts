import type { AgendaAppointmentStatus, DepositPaymentStatus } from '@/features/scheduling/domain/daily-agenda.constants'

export const DAILY_AGENDA_PATH = '/admin/citas/agenda'

export const DAILY_AGENDA_DATE_PARAM = 'fecha'

export const dailyAgendaMessages = {
  title: 'Agenda del día',
  subtitle: 'Las citas del día en orden, con lo que necesitas para atender la jornada.',
  loading: 'Cargando la agenda…',
  empty: 'No hay citas este día.',
  truncated: (limit: number) => `Este día tiene más de ${limit} citas: la agenda muestra las primeras ${limit}.`,
  loadError: 'No pudimos cargar la agenda de este día.',
  retry: 'Reintentar',
  dayNavLabel: 'Cambiar de día',
  previousDay: 'Día anterior',
  nextDay: 'Día siguiente',
  today: 'Hoy',
  listLabel: (day: string) => `Citas del ${day}`,
  duration: (minutes: number) => `${minutes} min`,
  timeRange: (from: string, until: string) => `${from} – ${until}`,
  labels: {
    duration: 'Duración',
    payment: 'Pago',
  },
  noClient: 'Sin clienta asignada',
  unnamedClient: 'Clienta sin nombre',
  noPayment: 'Sin datos de pago',
  paymentNotApplicable: 'No aplica: cita rechazada',
  openRecord: 'Abrir expediente',
  openRecordLabel: (name: string) => `Abrir el expediente de ${name}`,
  clientAppointments: 'Ver sus citas',
  clientAppointmentsLabel: (name: string) => `Ver las citas de ${name}`,
  status: {
    pending_approval: 'Pendiente de aprobar',
    approved: 'Aprobada',
    confirmed: 'Confirmada',
    completed: 'Atendida',
    no_show: 'No se presentó',
    rejected: 'Rechazada',
  } satisfies Record<AgendaAppointmentStatus, string>,
  payment: {
    not_required: 'Sin anticipo',
    unpaid: 'Anticipo pendiente',
    partial: 'Anticipo parcial',
    covered: 'Anticipo registrado',
  } satisfies Record<DepositPaymentStatus, string>,
  error: {
    title: 'No se pudo cargar la agenda',
    body: 'Ocurrió un error al preparar la agenda del día.',
    retry: 'Reintentar',
  },
} as const
