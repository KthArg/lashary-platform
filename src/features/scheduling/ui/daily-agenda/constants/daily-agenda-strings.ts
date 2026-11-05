import type { AgendaAppointmentStatus, DepositPaymentStatus } from '@/features/scheduling/domain/daily-agenda.constants'

export const DAILY_AGENDA_PATH = '/admin/citas/agenda'

export const DAILY_AGENDA_DATE_PARAM = 'fecha'

export const dailyAgendaMessages = {
  title: 'Agenda del día',
  subtitle: 'Las citas del día en orden, con lo que necesitas para atender la jornada.',
  loading: 'Cargando la agenda…',
  empty: 'No hay citas este día.',
  truncated: (limit: number) => `Este día tiene más de ${limit} citas: la agenda muestra las primeras ${limit}.`,
  delinquencyUnavailable: 'No pudimos comprobar la morosidad de las clientas: revisa cada caso antes de atender.',
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
  delinquent: 'Morosidad activa',
  openRecord: 'Abrir expediente',
  openRecordLabel: (name: string) => `Abrir expediente de ${name}`,
  clientAppointments: 'Ver sus citas',
  clientAppointmentsLabel: (name: string) => `Ver sus citas de ${name}`,
  close: {
    start: 'Cerrar cita',
    startLabel: (name: string, day: string) => `Cerrar la cita de ${name}, ${day}`,
    question: (name: string) => `¿Qué pasó con la cita de ${name}?`,
    completedLabel: 'Atendida',
    noShowLabel: 'No se presentó (ausencia sin aviso)',
    completedSummary: (charge: string, deposit: string, due: string) =>
      `Se cobra ${charge}, se descuenta el anticipo de ${deposit} y quedan ${due} por pagar.`,
    completedCreditSummary: (charge: string, deposit: string, credit: string) =>
      `Se cobra ${charge}, se descuenta el anticipo de ${deposit} y quedan ${credit} a favor de la clienta.`,
    noShowSummary: (deposit: string) => `Sin cargo. La clienta pierde el anticipo de ${deposit}.`,
    noShowWithoutDeposit: 'Sin cargo. No hay anticipo registrado que perder.',
    serviceLabel: 'Servicio prestado',
    reservedService: (name: string) => `El reservado (${name})`,
    irreversibleWarning: 'Al confirmar, la cita queda cerrada y no se puede revertir desde el sistema.',
    confirm: 'Confirmar cierre',
    closing: 'Cerrando…',
    back: 'Volver',
    closed: (name: string, summary: string) => `Cita de ${name} cerrada. ${summary}`,
  },
  unclosed: {
    title: 'Citas pasadas sin cerrar',
    description: 'Márcalas como atendidas o como ausencia. Siguen aquí hasta que las cierres.',
    openDay: 'Ir a ese día',
    openDayLabel: (name: string, day: string) => `Ir al día de la cita de ${name}, ${day}`,
    loadError: 'No pudimos comprobar las citas pasadas sin cerrar: revisa los días anteriores.',
    truncated: (limit: number) => `Hay más de ${limit} citas sin cerrar: aquí se muestran las más antiguas.`,
  },
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
