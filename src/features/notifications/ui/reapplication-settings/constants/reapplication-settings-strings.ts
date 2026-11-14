export const REAPPLICATION_SETTINGS_PATH = '/admin/citas/re-aplicacion'

export const reapplicationSettingsMessages = {
  title: 'Re-aplicación',
  subtitle: 'Cuántos días antes de la fecha estimada de re-aplicación se le avisa a la clienta.',
  label: (minDays: number, maxDays: number) => `Días de anticipación (de ${minDays} a ${maxDays})`,
  save: 'Guardar',
  saving: 'Guardando…',
  saved: 'Anticipación actualizada.',
  loading: 'Cargando…',
  loadFailed: 'No se pudo leer la anticipación configurada.',
  reload: 'Reintentar',
  invalid: (minDays: number, maxDays: number) =>
    `La anticipación debe ser un número entero de ${minDays} a ${maxDays} días.`,
  saveFailed: 'No se pudo guardar la anticipación. Intentá de nuevo.',
  error: {
    title: 'No pudimos mostrar la anticipación configurada',
    body: 'Ocurrió un problema al cargarla. Intenta de nuevo.',
    retry: 'Reintentar',
  },
}
