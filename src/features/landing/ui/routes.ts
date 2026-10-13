export const RESERVE_ROUTE = '/portal'

export const LOGIN_ROUTE = '/login'

export const HOME_ROUTE = '/'

export const HOME_ANCHOR = '#inicio'

// Las anclas de la cabecera son de la portada: desde cualquier otra página del sitio hay que
// volver a ella. Sin ruta conocida (fuera del router) se asume la portada.
export function anchorBaseFor(pathname: string | null): string {
  return pathname === null || pathname === HOME_ROUTE ? '' : HOME_ROUTE
}

export const RESERVE_TECHNIQUE_PARAM = 'tecnica'

export function reserveRouteFor(techniqueId: string): string {
  return `${RESERVE_ROUTE}?${RESERVE_TECHNIQUE_PARAM}=${encodeURIComponent(techniqueId)}`
}
