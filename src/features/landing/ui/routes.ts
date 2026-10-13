export const RESERVE_ROUTE = '/portal'

export const LOGIN_ROUTE = '/login'

export const HOME_ANCHOR = '#inicio'

export const RESERVE_TECHNIQUE_PARAM = 'tecnica'

export function reserveRouteFor(techniqueId: string): string {
  return `${RESERVE_ROUTE}?${RESERVE_TECHNIQUE_PARAM}=${encodeURIComponent(techniqueId)}`
}
