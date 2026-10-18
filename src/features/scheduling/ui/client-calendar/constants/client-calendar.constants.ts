export const CLIENT_CALENDAR_PATH = '/portal/citas/calendario'

// Nombres de los parámetros de la URL: el servicio y el día viven en la URL para que cambiar de
// día sea un enlace (criterio 4) y el estado se pueda compartir o recargar.
export const CALENDAR_PARAMS = { service: 'servicio', date: 'fecha' } as const

// Tope de técnicas que se leen del catálogo para el selector (PERF-002).
export const MAX_CALENDAR_SERVICES = 100
