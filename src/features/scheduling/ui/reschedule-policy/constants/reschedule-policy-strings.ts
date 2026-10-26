export const RESCHEDULE_POLICY_PATH = '/admin/citas/reagendados'

export const RESCHEDULE_LIMIT_FIELD = 'max'

export const RESCHEDULE_LIMIT_HINT_ID = 'reschedule-limit-hint'

const pluralizeTimes = (count: number): string => `${count} ${count === 1 ? 'vez' : 'veces'}`

export const reschedulePolicyMessages = {
  title: 'Reagendados por cita',
  subtitle: 'Define cuántas veces puede una clienta reagendar una misma cita.',
  limitLabel: 'Reagendados permitidos por cita',
  limitHint: (max: number) =>
    max === 0
      ? 'Reagendar está desactivado: ninguna clienta puede mover sus citas.'
      : `Cada cita se puede reagendar hasta ${pluralizeTimes(max)}. Al reagendar, la cita vuelve a quedar pendiente de aprobación.`,
  submit: 'Guardar',
  saving: 'Guardando…',
  saved: (max: number) =>
    max === 0 ? 'Reagendar quedó desactivado.' : `Cada cita se puede reagendar hasta ${pluralizeTimes(max)}.`,
  invalid: (maxAllowed: number) => `Escribe un número entero, de 0 a ${maxAllowed}.`,
  failed: 'No pudimos guardar el tope. Intenta de nuevo.',
  loadFailed: 'No pudimos cargar el tope de reagendados.',
  reload: 'Reintentar',
  loading: 'Cargando el tope de reagendados…',
  error: {
    title: 'No pudimos mostrar el tope de reagendados',
    body: 'Ocurrió un problema al cargarlo. Intenta de nuevo.',
    retry: 'Reintentar',
  },
} as const
