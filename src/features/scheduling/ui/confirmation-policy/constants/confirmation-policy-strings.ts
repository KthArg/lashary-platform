export const CONFIRMATION_POLICY_PATH = '/admin/citas/confirmacion'

export const CONFIRMATION_DEADLINE_FIELD = 'hours'

export const CONFIRMATION_DEADLINE_HINT_ID = 'confirmation-deadline-hint'

const pluralizeHours = (hours: number): string => `${hours} ${hours === 1 ? 'hora' : 'horas'}`

export const confirmationPolicyMessages = {
  title: 'Plazo de confirmación',
  subtitle: 'Define desde cuántas horas antes de la cita se destaca en la agenda si la clienta no confirmó.',
  hoursLabel: 'Horas antes de la cita',
  hoursHint: (hours: number) =>
    hours === 0
      ? 'Sin plazo: la agenda no destaca las citas sin confirmar.'
      : `Una cita aprobada se destaca en la agenda cuando faltan ${pluralizeHours(hours)} o menos y la clienta no confirmó. Solo se destaca: nada se cancela solo.`,
  submit: 'Guardar',
  saving: 'Guardando…',
  saved: (hours: number) => `El plazo quedó en ${pluralizeHours(hours)}.`,
  invalid: (max: number) => `Escribe un número entero de horas, de 0 a ${max}.`,
  failed: 'No pudimos guardar el plazo. Intenta de nuevo.',
  loadFailed: 'No pudimos cargar el plazo de confirmación.',
  reload: 'Reintentar',
  loading: 'Cargando el plazo de confirmación…',
  error: {
    title: 'No pudimos mostrar el plazo de confirmación',
    body: 'Ocurrió un problema al cargarlo. Intenta de nuevo.',
    retry: 'Reintentar',
  },
} as const
