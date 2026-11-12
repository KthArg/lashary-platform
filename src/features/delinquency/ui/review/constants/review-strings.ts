export const DELINQUENCY_ADMIN_PATH = '/admin/morosidades'

export const REVIEW_ERRORS = {
  invalidInput: 'No se pudo leer la decisión. Recargue la página e inténtelo nuevamente.',
  notFound: 'Esa morosidad ya no existe. Recargue la página.',
  alreadyDecided: 'Esa morosidad ya se decidió. Recargue la página para ver su estado.',
  saveFailed: 'No se pudo guardar la decisión. Inténtelo nuevamente.',
} as const
