export const PAYMENT_REMINDER_SETTINGS_PATH = '/admin/citas/recordatorio-pago'

export const paymentReminderSettingsMessages = {
  title: 'Recordatorio de pago',
  subtitle: 'Cada cuántos días se le repite el recordatorio a la clienta con un pago pendiente, hasta que lo regularice.',
  label: (minDays: number, maxDays: number) => `Días entre recordatorios (de ${minDays} a ${maxDays})`,
  save: 'Guardar',
  saving: 'Guardando…',
  saved: 'Frecuencia actualizada.',
  loading: 'Cargando…',
  loadFailed: 'No se pudo leer la frecuencia configurada.',
  reload: 'Reintentar',
  invalid: (minDays: number, maxDays: number) => `La frecuencia debe ser un número entero de ${minDays} a ${maxDays} días.`,
  saveFailed: 'No se pudo guardar la frecuencia. Intenta de nuevo.',
  error: {
    title: 'No pudimos mostrar la frecuencia configurada',
    body: 'Ocurrió un problema al cargarla. Intenta de nuevo.',
    retry: 'Reintentar',
  },
}
