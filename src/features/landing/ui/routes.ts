// Destino fijo de "Reservar cita" (decisión del PO, landing/SPEC.md): no se edita en el CMS.
// Hasta que exista la reserva en línea (US-AGE-05) es la entrada al portal de la clienta, que
// manda a /login a quien no tiene sesión.
export const RESERVE_ROUTE = '/portal'

export const HOME_ANCHOR = '#inicio'

// "Reservar esta técnica" (criterio 5 de US-LAND-02): el mismo destino fijo, con la técnica
// elegida en la query. Hoy el portal ignora el parámetro; lo recogerá US-AGE-05, que es donde
// se elige técnica al reservar. Llevarlo desde ya evita que el enlace de la landing tenga que
// cambiar cuando esa historia llegue.
export const RESERVE_TECHNIQUE_PARAM = 'tecnica'

export function reserveRouteFor(techniqueId: string): string {
  return `${RESERVE_ROUTE}?${RESERVE_TECHNIQUE_PARAM}=${encodeURIComponent(techniqueId)}`
}
