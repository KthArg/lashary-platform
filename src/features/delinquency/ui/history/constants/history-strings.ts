import type { DisplayedState } from '@/features/delinquency/domain/case-history'

export const HISTORY_PATH = '/admin/morosidades/historial'

export const historyDetailPath = (caseId: string): string => `${HISTORY_PATH}/${caseId}`

const STATE_LABELS = {
  pending_review: 'Por confirmar',
  active: 'Activa',
  pending_approval: 'Pendiente de aprobación',
  settled: 'Saldada',
  forgiven: 'Condonada',
  dismissed: 'Descartada',
  lifted: 'Levantada',
} as const satisfies Record<DisplayedState, string>

export const historyMessages = {
  title: 'Historial de morosidades',
  subtitle: 'Todas las morosidades, de la más reciente a la más antigua, sin importar cómo terminaron.',
  loading: 'Cargando el historial…',
  loadError: 'No se pudo cargar el historial de morosidades.',
  retry: 'Reintentar',
  error: {
    title: 'No se pudo cargar el historial',
    body: 'Hubo un problema al leer los datos. Inténtelo nuevamente.',
  },
  states: STATE_LABELS,
  filters: { all: 'Todas', ...STATE_LABELS },
  filter: { formLabel: 'Filtrar el historial', selectLabel: 'Estado', submit: 'Filtrar' },
  headers: {
    client: 'Clienta',
    amount: 'Monto',
    appointment: 'Cita asociada',
    origin: 'Fecha de origen',
    state: 'Estado',
    actions: 'Detalle',
  },
  clientFallback: 'Clienta sin nombre',
  appointmentMissing: 'Cita no disponible',
  appointmentsUnavailable: 'No se pudieron leer las citas asociadas. El resto del historial sí se muestra.',
  detailLink: 'Ver detalle',
  detailLinkLabel: (clientName: string) => `Ver detalle de ${clientName}`,
  emptyAll: 'Todavía no hay morosidades.',
  emptyFiltered: 'Ninguna morosidad coincide con el filtro.',
  pagination: {
    navLabel: 'Paginación del historial',
    status: (page: number, totalPages: number) => `Página ${page} de ${totalPages}`,
    total: (total: number) => `${total} morosidades`,
    sizeLabel: 'Por página',
    sizeApply: 'Aplicar',
    previous: 'Anterior',
    next: 'Siguiente',
  },
} as const
