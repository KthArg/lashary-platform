import type { CaseState } from './delinquency-case'
import type { DisplayedState, HistoryAppointment } from './case-history'
import type { RequestState } from './regularization'

export const TIMELINE_ACTIONS = {
  caseConfirmed: 'delinquency.case.confirmed',
  caseDismissed: 'delinquency.case.dismissed',
  caseLifted: 'delinquency.case.lifted',
  caseForgiven: 'delinquency.case.forgiven',
  requestSubmitted: 'delinquency.regularization.submitted',
  requestApproved: 'delinquency.regularization.approved',
  requestRejected: 'delinquency.regularization.rejected',
} as const

export const TIMELINE_ENTITY_TYPES = {
  case: 'delinquency_case',
  request: 'delinquency_regularization',
} as const

export const TIMELINE_REQUESTS_MAX = 50

const CASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface DetailRequest {
  readonly id: string
  readonly state: RequestState
  readonly declaredAmount: number
  readonly reference: string | null
  readonly approvedAmount: number | null
  readonly rejectionReason: string | null
  readonly createdAt: Date
  readonly reviewedAt: Date | null
}

export interface TimelineEvent {
  readonly id: string
  readonly action: string
  readonly actorId: string
  readonly createdAt: Date
  readonly entityType: string
}

export interface CaseDetailRecord {
  readonly caseId: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly pendingToday: number
  readonly state: CaseState
  readonly detectedAt: Date
  readonly decidedAt: Date | null
  readonly settledAt: Date | null
  readonly exceptionReason: string | null
  readonly exceptionAmount: number | null
  readonly requests: DetailRequest[]
}

export interface CaseDetail extends Omit<CaseDetailRecord, 'appointmentId' | 'state'> {
  readonly clientName: string | null
  readonly state: DisplayedState
  readonly appointment: HistoryAppointment | null
  readonly appointmentUnavailable: boolean
  readonly timeline: TimelineEvent[]
  readonly timelineUnavailable: boolean
}

export const isCaseId = (value: string): boolean => CASE_ID_PATTERN.test(value)

export const hasPendingRequest = (requests: readonly DetailRequest[]): boolean =>
  requests.some((request) => request.state === 'pending_approval')

export const latestRequestIds = (requestIds: readonly string[]): string[] => requestIds.slice(0, TIMELINE_REQUESTS_MAX)

export const sortTimeline = (events: readonly TimelineEvent[]): TimelineEvent[] =>
  [...events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  )
