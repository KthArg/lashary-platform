import { readInactiveRangeDays } from '@/features/notifications/domain/inactive-reminder'
import { INACTIVE_CLIENTS_PATH, INACTIVE_CLIENTS_QUERY } from '../constants/inactive-clients-strings'
import type { InactiveClientsLocation, InactiveClientsSearchParams } from '../types/inactive-clients.types'

const FIRST_PAGE = 1
const DIGITS_ONLY = /^\d+$/

const firstValue = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value)

export function readInactiveClientsLocation(params: InactiveClientsSearchParams): InactiveClientsLocation {
  const rawPage = firstValue(params.pagina)
  const page = rawPage !== undefined && DIGITS_ONLY.test(rawPage) ? Number(rawPage) : FIRST_PAGE
  return {
    rangeDays: readInactiveRangeDays(firstValue(params.rango)),
    page: page >= FIRST_PAGE ? page : FIRST_PAGE,
  }
}

export function inactiveClientsUrl({ rangeDays, page }: InactiveClientsLocation): string {
  const query = new URLSearchParams({ [INACTIVE_CLIENTS_QUERY.range]: String(rangeDays) })
  if (page > FIRST_PAGE) query.set(INACTIVE_CLIENTS_QUERY.page, String(page))
  return `${INACTIVE_CLIENTS_PATH}?${query.toString()}`
}
