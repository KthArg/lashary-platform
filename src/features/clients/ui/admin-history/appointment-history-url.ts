import { clientAppointmentsPath } from '../client-routes'

const FIRST_PAGE = 0

export function parseHistoryPage(rawPage: string | string[] | undefined): number {
  const page = Number(Array.isArray(rawPage) ? rawPage[0] : rawPage)
  return Number.isInteger(page) && page > FIRST_PAGE ? page : FIRST_PAGE
}

export function appointmentHistoryUrl(clientId: string, page: number): string {
  const path = clientAppointmentsPath(clientId)
  return page > FIRST_PAGE ? `${path}?page=${page}` : path
}
