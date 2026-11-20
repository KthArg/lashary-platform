import { ok, isErr, type Result } from '@/shared/result'
import { ACTIVE_CASES_LIST_LIMIT } from '../domain/active-case'
import { REVIEW_LIST_LIMIT } from '../domain/active-client'
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
  readonly caseId: string
  readonly clientId: string
  readonly clientName: string | null
  readonly appointmentId: string
  readonly pending: number
  readonly exceptionAmount: number | null
  readonly since: Date
}

export interface ReviewView {
  readonly toReview: ReviewItem[]
  readonly active: ActiveItem[]
  readonly moreToReview: boolean
  readonly moreActive: boolean
}

export const loadReview =
  (deps: { cases: CaseListRepository; names: ClientNamesPort }) =>
  async (): Promise<Result<ReviewView, DelinquencyStorageFailed>> => {
    const [pendingRead, activeRead] = await Promise.all([
      deps.cases.listByState('pending_review', REVIEW_LIST_LIMIT + 1),
      deps.cases.listActiveCases(ACTIVE_CASES_LIST_LIMIT + 1),
    ])
    if (isErr(pendingRead)) return pendingRead
    if (isErr(activeRead)) return activeRead
    const pending = pendingRead.value.slice(0, REVIEW_LIST_LIMIT)
    const active = activeRead.value.slice(0, ACTIVE_CASES_LIST_LIMIT)

    const clientIds = [
      ...new Set([...pending.map((reviewCase) => reviewCase.clientId), ...active.map((activeCase) => activeCase.clientId)]),
    ]
    const names = await deps.names.namesFor(clientIds)
    if (isErr(names)) return names

    const nameOf = (clientId: string): string | null => names.value.get(clientId) ?? null
    return ok({
      toReview: pending.map((reviewCase) => ({
        caseId: reviewCase.id,
        clientId: reviewCase.clientId,
        clientName: nameOf(reviewCase.clientId),
        pending: reviewCase.pending,
        detectedAt: reviewCase.detectedAt,
      })),
      active: active.map((activeCase) => ({
        caseId: activeCase.caseId,
        clientId: activeCase.clientId,
        clientName: nameOf(activeCase.clientId),
        appointmentId: activeCase.appointmentId,
        pending: activeCase.pending,
        exceptionAmount: activeCase.exceptionAmount,
        since: activeCase.since,
      })),
      moreToReview: pendingRead.value.length > REVIEW_LIST_LIMIT,
      moreActive: activeRead.value.length > ACTIVE_CASES_LIST_LIMIT,
    })
  }
