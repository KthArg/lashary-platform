import { ok, isErr, type Result } from '@/shared/result'
import { ACTIVE_LIST_LIMIT, REVIEW_LIST_LIMIT } from '../domain/active-client'
import type { DelinquencyStorageFailed } from '../domain/errors'
import type { CaseListRepository, ClientNamesPort } from './ports'

export interface ReviewItem {
  readonly caseId: string
  readonly clientId: string
  readonly clientName: string | null
  readonly pending: number
  readonly detectedAt: Date
}

export interface ActiveItem {
  readonly clientId: string
  readonly clientName: string | null
  readonly pending: number
  readonly since: Date
}

export interface ReviewView {
  readonly toReview: ReviewItem[]
  readonly active: ActiveItem[]
}

export const loadReview =
  (deps: { cases: CaseListRepository; names: ClientNamesPort }) =>
  async (): Promise<Result<ReviewView, DelinquencyStorageFailed>> => {
    const [pending, active] = await Promise.all([
      deps.cases.listByState('pending_review', REVIEW_LIST_LIMIT),
      deps.cases.listActiveClients(ACTIVE_LIST_LIMIT),
    ])
    if (isErr(pending)) return pending
    if (isErr(active)) return active

    const clientIds = [...new Set([...pending.value.map((c) => c.clientId), ...active.value.map((c) => c.clientId)])]
    const names = await deps.names.namesFor(clientIds)
    if (isErr(names)) return names

    const nameOf = (clientId: string): string | null => names.value.get(clientId) ?? null
    return ok({
      toReview: pending.value.map((c) => ({
        caseId: c.id,
        clientId: c.clientId,
        clientName: nameOf(c.clientId),
        pending: c.pending,
        detectedAt: c.detectedAt,
      })),
      active: active.value.map((c) => ({
        clientId: c.clientId,
        clientName: nameOf(c.clientId),
        pending: c.pending,
        since: c.since,
      })),
    })
  }
