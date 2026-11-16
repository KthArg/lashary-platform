import { ok, isErr, type Result } from '@/shared/result'
import { ACTIVE_CASES_LIST_LIMIT } from '../domain/active-case'
import { REVIEW_LIST_LIMIT } from '../domain/active-client'
import { EXCEPTION_HISTORY_LIST_LIMIT } from '../domain/delinquency-case'
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

// Historial de excepciones (criterio 4 de US-MOR-05): la morosidad original sigue visible, con su
// pending de siempre y, si se condonó, el monto condonado — no se borra nada.
export interface ExceptionHistoryItem {
  readonly caseId: string
  readonly clientId: string
  readonly clientName: string | null
  readonly pending: number
  readonly exceptionReason: string | null
  readonly exceptionAmount: number | null
  readonly decidedAt: Date | null
}

// `moreToReview`, `moreActive`, `moreLifted` y `moreForgiven` dicen que hay más de lo que se muestra:
// cada lista trae hasta su tope y la pantalla avisa en vez de callar lo que queda fuera.
export interface ReviewView {
  readonly toReview: ReviewItem[]
  readonly active: ActiveItem[]
  readonly lifted: ExceptionHistoryItem[]
  readonly forgiven: ExceptionHistoryItem[]
  readonly moreToReview: boolean
  readonly moreActive: boolean
  readonly moreLifted: boolean
  readonly moreForgiven: boolean
}

export const loadReview =
  (deps: { cases: CaseListRepository; names: ClientNamesPort }) =>
  async (): Promise<Result<ReviewView, DelinquencyStorageFailed>> => {
    // Se pide una fila más que el tope: si llega, hay más de lo que se muestra.
    const [pendingRead, activeRead, liftedRead, forgivenRead] = await Promise.all([
      deps.cases.listByState('pending_review', REVIEW_LIST_LIMIT + 1),
      deps.cases.listActiveCases(ACTIVE_CASES_LIST_LIMIT + 1),
      deps.cases.listByState('lifted', EXCEPTION_HISTORY_LIST_LIMIT + 1),
      deps.cases.listByState('forgiven', EXCEPTION_HISTORY_LIST_LIMIT + 1),
    ])
    if (isErr(pendingRead)) return pendingRead
    if (isErr(activeRead)) return activeRead
    if (isErr(liftedRead)) return liftedRead
    if (isErr(forgivenRead)) return forgivenRead
    const pending = pendingRead.value.slice(0, REVIEW_LIST_LIMIT)
    const active = activeRead.value.slice(0, ACTIVE_CASES_LIST_LIMIT)
    const lifted = liftedRead.value.slice(0, EXCEPTION_HISTORY_LIST_LIMIT)
    const forgiven = forgivenRead.value.slice(0, EXCEPTION_HISTORY_LIST_LIMIT)

    const clientIds = [
      ...new Set([
        ...pending.map((c) => c.clientId),
        ...active.map((c) => c.clientId),
        ...lifted.map((c) => c.clientId),
        ...forgiven.map((c) => c.clientId),
      ]),
    ]
    const names = await deps.names.namesFor(clientIds)
    if (isErr(names)) return names

    const nameOf = (clientId: string): string | null => names.value.get(clientId) ?? null
    const toHistoryItem = (c: (typeof lifted)[number]): ExceptionHistoryItem => ({
      caseId: c.id,
      clientId: c.clientId,
      clientName: nameOf(c.clientId),
      pending: c.pending,
      exceptionReason: c.exceptionReason,
      exceptionAmount: c.exceptionAmount,
      decidedAt: c.decidedAt,
    })

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
      lifted: lifted.map(toHistoryItem),
      forgiven: forgiven.map(toHistoryItem),
      moreToReview: pendingRead.value.length > REVIEW_LIST_LIMIT,
      moreActive: activeRead.value.length > ACTIVE_CASES_LIST_LIMIT,
      moreLifted: liftedRead.value.length > EXCEPTION_HISTORY_LIST_LIMIT,
      moreForgiven: forgivenRead.value.length > EXCEPTION_HISTORY_LIST_LIMIT,
    })
  }
