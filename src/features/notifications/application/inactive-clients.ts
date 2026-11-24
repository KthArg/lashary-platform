import { isErr, ok, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import {
  INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
  INACTIVE_REMINDER_MIN_DAYS_BETWEEN,
  inactiveSince,
  validateInactiveQueueRequest,
  type InactiveClient,
  type InactiveQueueOutcome,
  type InactiveRangeDays,
} from '../domain/inactive-reminder'
import type { InactiveClientsRepository, InactiveQueueFailure, RepositoryFailure } from './ports'

export const INACTIVE_CLIENTS_PAGE_SIZE = 20

export type LoadInactiveClientsQuery = { rangeDays: InactiveRangeDays; page: number }

export type InactiveClientsView = {
  rangeDays: InactiveRangeDays
  since: Date
  page: number
  pageSize: number
  total: number
  clients: InactiveClient[]
}

export type LoadInactiveClientsDeps = { repository: InactiveClientsRepository; clock: Clock }

const FIRST_PAGE = 1

const sanitizePage = (page: number): number => (Number.isInteger(page) && page >= FIRST_PAGE ? page : FIRST_PAGE)

export const loadInactiveClients =
  (deps: LoadInactiveClientsDeps) =>
  async (query: LoadInactiveClientsQuery): Promise<Result<InactiveClientsView, RepositoryFailure>> => {
    const page = sanitizePage(query.page)
    const since = inactiveSince(deps.clock(), query.rangeDays)
    const result = await deps.repository.listPage({
      since,
      offset: (page - FIRST_PAGE) * INACTIVE_CLIENTS_PAGE_SIZE,
      limit: INACTIVE_CLIENTS_PAGE_SIZE,
    })
    if (isErr(result)) return result
    return ok({
      rangeDays: query.rangeDays,
      since,
      page,
      pageSize: INACTIVE_CLIENTS_PAGE_SIZE,
      total: result.value.total,
      clients: result.value.clients,
    })
  }

export const queueInactiveReminders =
  (repository: InactiveClientsRepository) =>
  async (clientIds: readonly string[]): Promise<Result<InactiveQueueOutcome, InactiveQueueFailure>> => {
    const request = validateInactiveQueueRequest(clientIds)
    if (isErr(request)) return request
    return repository.queue(request.value, {
      maxClients: INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
      minDaysBetween: INACTIVE_REMINDER_MIN_DAYS_BETWEEN,
    })
  }
