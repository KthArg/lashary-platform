// Formato de fechas/horas para mostrar en el panel, en hora de Costa Rica — la conversión a
// local ocurre solo en display (DOM-003), nunca en lo que se guarda.
const INSTANT_FORMATTER = new Intl.DateTimeFormat('es-CR', {
  timeZone: 'America/Costa_Rica',
  dateStyle: 'medium',
  timeStyle: 'short',
})

// Postgres devuelve TIME como "HH:MM:SS"; el panel muestra "HH:MM" (el negocio agenda al minuto).
const HH_MM_LENGTH = 5

export function formatTime(value: string): string {
  return value.slice(0, HH_MM_LENGTH)
}

export function formatInstant(value: Date): string {
  return INSTANT_FORMATTER.format(value)
}

// closedDate llega como "YYYY-MM-DD" sin hora. Pasarlo directo a `new Date(...)` lo interpreta
// como medianoche UTC, y formatearlo en hora de Costa Rica (UTC-6) lo corre un día para atrás.
// Se arma el texto a mano para evitar ese corrimiento.
export function formatClosedDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
