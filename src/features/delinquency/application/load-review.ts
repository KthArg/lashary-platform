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

// Por caso, no agregado por clienta (US-MOR-05): cada morosidad active se levanta o se condona por
// separado, así que la pantalla necesita el caseId y el appointmentId de cada una.
export interface ActiveItem {
  readonly caseId: string
  readonly clientId: string
  readonly clientName: string | null
  readonly appointmentId: string
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
      deps.cases.listActiveCases(ACTIVE_CASES_LIST_LIMIT + 1),
    ])
    if (isErr(pendingRead)) return pendingRead
    if (isErr(activeRead)) return activeRead
    const pending = pendingRead.value.slice(0, REVIEW_LIST_LIMIT)
    const active = activeRead.value.slice(0, ACTIVE_CASES_LIST_LIMIT)

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
        caseId: c.caseId,
        clientId: c.clientId,
        clientName: nameOf(c.clientId),
        appointmentId: c.appointmentId,
        pending: c.pending,
        since: c.since,
      })),
      moreToReview: pendingRead.value.length > REVIEW_LIST_LIMIT,
      moreActive: activeRead.value.length > ACTIVE_CASES_LIST_LIMIT,
    })
  }
