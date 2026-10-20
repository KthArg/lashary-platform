import type { AlertKind } from '../../../domain/alert'

export const ALERTS_PATH = '/admin/citas/alertas'

export const ALERTS_LIMIT = 50

export const alertsMessages = {
  title: 'Alertas',
  subtitle:
    'Avisos del sistema que conviene revisar. Una alerta no cancela ninguna cita ni afecta a la clienta: solo te dice que algo no salió como se esperaba.',
  loading: 'Cargando las alertas…',
  empty: 'No hay alertas. Es lo esperado: una alerta aparece solo si algo sale mal al reservar.',
  loadError: 'No pudimos cargar las alertas.',
  retry: 'Reintentar',
  requestedLabel: 'Espacio pedido',
  recordedLabel: 'Registrada',
  kinds: {
    appointment_overlap_rejected: {
      title: 'Se rechazó una reserva por solape',
      detail:
        'El sistema impidió que dos citas ocuparan el mismo espacio, pero eso no debía llegar a pasar: el bloqueo previo ya debía haberlo evitado. Conviene revisar la agenda de ese día.',
    },
  } satisfies Record<AlertKind, { title: string; detail: string }>,
  error: {
    title: 'No se pudieron cargar las alertas',
    body: 'Ocurrió un error al leer las alertas.',
    retry: 'Reintentar',
  },
} as const
