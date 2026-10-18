export const RESERVE_ROUTE = '/portal'

export const LOGIN_ROUTE = '/login'

export const HOME_ROUTE = '/'

export const HOME_ANCHOR = '#inicio'

export function anchorBaseFor(pathname: string | null): string {
  return pathname === null || pathname === HOME_ROUTE ? '' : HOME_ROUTE
}

export const RESERVE_TECHNIQUE_PARAM = 'tecnica'

export function reserveRouteFor(techniqueId: string): string {
  return `${RESERVE_ROUTE}?${RESERVE_TECHNIQUE_PARAM}=${encodeURIComponent(techniqueId)}`
}
