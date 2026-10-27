import { isErr, ok, type Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type {
  ClientAppointmentsPage,
  ClientAppointmentsRepository,
  ListClientAppointmentsQuery,
} from './client-appointments-ports'

export const CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE = 25
export const CLIENT_APPOINTMENTS_MAX_PAGE_SIZE = 50

const FIRST_PAGE = 0

function sanitizeClientAppointmentsPage(page: number | undefined): number {
  if (page === undefined || !Number.isInteger(page) || page < FIRST_PAGE) return FIRST_PAGE
  return page
}

function sanitizeClientAppointmentsPageSize(pageSize: number | undefined): number {
  if (pageSize === undefined || !Number.isInteger(pageSize) || pageSize < 1) {
    return CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE
  }
  return Math.min(pageSize, CLIENT_APPOINTMENTS_MAX_PAGE_SIZE)
}

export const listClientAppointments =
  (appointments: ClientAppointmentsRepository) =>
  async (query: ListClientAppointmentsQuery): Promise<Result<ClientAppointmentsPage, StorageFailed>> => {
    const page = sanitizeClientAppointmentsPage(query.page)
    const pageSize = sanitizeClientAppointmentsPageSize(query.pageSize)

    const rows = await appointments.listByClient({
      clientId: query.clientId,
      offset: page * pageSize,
      limit: pageSize,
    })
    if (isErr(rows)) return rows

    return ok({ items: rows.value.items, total: rows.value.total, page, pageSize })
  }
