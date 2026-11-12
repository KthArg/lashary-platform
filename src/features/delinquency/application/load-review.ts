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

// `moreToReview` y `moreActive` dicen que hay más de lo que se muestra: cada lista trae hasta su tope y la
// pantalla avisa en vez de callar lo que queda fuera.
export interface ReviewView {
  readonly toReview: ReviewItem[]
  readonly active: ActiveItem[]
  readonly moreToReview: boolean
  readonly moreActive: boolean
}

export const loadReview =
  (deps: { cases: CaseListRepository; names: ClientNamesPort }) =>
  async (): Promise<Result<ReviewView, DelinquencyStorageFailed>> => {
    // Se pide una fila más que el tope: si llega, hay más de lo que se muestra.
    const [pendingRead, activeRead] = await Promise.all([
      deps.cases.listByState('pending_review', REVIEW_LIST_LIMIT + 1),
      deps.cases.listActiveClients(ACTIVE_LIST_LIMIT + 1),
    ])
    if (isErr(pendingRead)) return pendingRead
    if (isErr(activeRead)) return activeRead
    const pending = pendingRead.value.slice(0, REVIEW_LIST_LIMIT)
    const active = activeRead.value.slice(0, ACTIVE_LIST_LIMIT)

    const clientIds = [...new Set([...pending.map((c) => c.clientId), ...active.map((c) => c.clientId)])]
    const names = await deps.names.namesFor(clientIds)
    if (isErr(names)) return names

    const nameOf = (clientId: string): string | null => names.value.get(clientId) ?? null
    return ok({
      toReview: pending.map((c) => ({
        caseId: c.id,
        clientId: c.clientId,
        clientName: nameOf(c.clientId),
        pending: c.pending,
        detectedAt: c.detectedAt,
      })),
      active: active.map((c) => ({
        clientId: c.clientId,
        clientName: nameOf(c.clientId),
        pending: c.pending,
        since: c.since,
      })),
      moreToReview: pendingRead.value.length > REVIEW_LIST_LIMIT,
      moreActive: activeRead.value.length > ACTIVE_LIST_LIMIT,
    })
  }
