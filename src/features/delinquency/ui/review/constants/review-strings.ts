export const DELINQUENCY_ADMIN_PATH = '/admin/morosidades'

export const REVIEW_ERRORS = {
  invalidInput: 'No se pudo leer la decisión. Recargue la página e inténtelo nuevamente.',
  notFound: 'Esa morosidad ya no existe. Recargue la página.',
  alreadyDecided: 'Esa morosidad ya se decidió. Recargue la página para ver su estado.',
  saveFailed: 'No se pudo guardar la decisión. Inténtelo nuevamente.',
  invalidGraceDays: 'Ingrese un número entero de 1 a 90.',
  graceSaveFailed: 'No se pudo guardar el periodo de gracia. Inténtelo nuevamente.',
} as const

export const reviewMessages = {
  title: 'Morosidades',
  subtitle: 'Revise los pagos pendientes que el sistema detectó. Ninguna clienta queda bloqueada hasta que usted confirme.',
  loading: 'Cargando morosidades…',
  toReview: {
    title: 'Por revisar',
    hint: 'Pago sin registrar pasado el plazo de gracia. Confirme si la morosidad procede o descártela si la clienta sí pagó.',
    empty: 'No hay morosidades por revisar.',
  },
  active: {
    title: 'Morosidades activas',
    empty: 'Ninguna clienta tiene una morosidad activa.',
  },
  grace: {
    title: 'Periodo de gracia',
    hint: 'Días que pasan desde que se cierra la cita hasta que un pago sin registrar se vuelve una morosidad por revisar. Cambiarlo rige solo para las detecciones nuevas: no toca las morosidades que ya existen.',
    label: 'Días de gracia (de 1 a 90)',
    save: 'Guardar',
    saved: 'Periodo de gracia actualizado.',
    unavailable: 'No se pudo leer el periodo de gracia.',
  },
  clientFallback: 'Clienta sin nombre',
  pendingLabel: 'Debe',
  detectedLabel: 'Detectada',
  sinceLabel: 'Moroso desde',
  confirm: 'Confirmar morosidad',
  dismiss: 'Descartar',
  saving: 'Guardando…',
  confirmedNotice: 'Morosidad confirmada.',
  dismissedNotice: 'Morosidad descartada.',
  loadError: 'No se pudieron cargar las morosidades.',
  retry: 'Reintentar',
  error: {
    title: 'No se pudieron cargar las morosidades',
    body: 'Hubo un problema al leer los datos. Inténtelo nuevamente.',
    retry: 'Reintentar',
  },
} as const
