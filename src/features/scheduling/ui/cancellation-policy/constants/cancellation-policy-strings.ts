export const CANCELLATION_POLICY_PATH = '/admin/citas/cancelacion'

export const CANCELLATION_WINDOW_FIELD = 'hours'

const pluralizeHours = (hours: number): string => `${hours} ${hours === 1 ? 'hora' : 'horas'}`

export const cancellationPolicyMessages = {
  title: 'Política de cancelación',
  subtitle: 'Define con cuánta antelación puede cancelar una clienta sin perder su anticipo.',
  hoursLabel: 'Horas de antelación',
  hoursHint: (hours: number) =>
    hours === 0
      ? 'Sin ventana: ninguna clienta pierde el anticipo al cancelar antes de que empiece la cita.'
      : `Quien cancele con menos de ${pluralizeHours(hours)} de antelación pierde el anticipo registrado; con más, no pierde nada.`,
  submit: 'Guardar',
  saving: 'Guardando…',
  saved: (hours: number) => `La ventana quedó en ${pluralizeHours(hours)}.`,
  invalid: (max: number) => `Escribe un número entero de horas, de 0 a ${max}.`,
  failed: 'No pudimos guardar la ventana. Intenta de nuevo.',
  savedWithoutAudit: 'La ventana se guardó, pero no quedó registrada en la bitácora. Avisa al equipo técnico.',
  accessDenied: 'Solo la administradora puede cambiar la política de cancelación.',
  loadFailed: 'No pudimos cargar la política de cancelación.',
  reload: 'Reintentar',
  loading: 'Cargando la política de cancelación…',
  error: {
    title: 'No pudimos mostrar la política de cancelación',
    body: 'Ocurrió un problema al cargarla. Intenta de nuevo.',
    retry: 'Reintentar',
  },
} as const
