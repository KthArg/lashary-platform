import type { CaseState } from './delinquency-case'

export const HISTORY_FILTERS = [
  'all',
  'pending_review',
  'active',
  'pending_approval',
  'settled',
  'forgiven',
  'dismissed',
  'lifted',
] as const

export type HistoryFilter = (typeof HISTORY_FILTERS)[number]

export const HISTORY_PAGE_SIZES = [10, 25, 50] as const

export const HISTORY_DEFAULT_PAGE_SIZE = 25

export type DisplayedState = CaseState | 'pending_approval'

export interface HistoryQuery {
  readonly filter: HistoryFilter
  readonly page: number
  readonly pageSize: number
}

export interface HistoryQueryInput {
  readonly filter?: string
  readonly page?: number
  readonly pageSize?: number
}

export interface HistoryRow {
  readonly caseId: string
  readonly clientId: string
  readonly appointmentId: string
  readonly pending: number
  readonly state: CaseState
  readonly detectedAt: Date
  readonly hasPendingRequest: boolean
}

export interface HistoryRowsPage {
  readonly rows: HistoryRow[]
  readonly total: number
}

export interface HistoryAppointment {
  readonly startsAtMs: number
  readonly serviceName: string | null
}

export interface HistoryItem {
  readonly caseId: string
  readonly clientName: string | null
  readonly pending: number
  readonly appointment: HistoryAppointment | null
  readonly detectedAt: Date
  readonly state: DisplayedState
}

export interface CaseHistoryPage {
  readonly items: HistoryItem[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly appointmentsUnavailable: boolean
}

export const displayedState = (state: CaseState, hasPendingRequest: boolean): DisplayedState =>
  state === 'active' && hasPendingRequest ? 'pending_approval' : state

const isHistoryFilter = (value: string | undefined): value is HistoryFilter =>
  HISTORY_FILTERS.some((filter) => filter === value)

const isHistoryPageSize = (value: number | undefined): value is (typeof HISTORY_PAGE_SIZES)[number] =>
  HISTORY_PAGE_SIZES.some((size) => size === value)

const normalizePage = (page: number | undefined): number =>
  page !== undefined && Number.isInteger(page) && page >= 0 ? page : 0

export const normalizeHistoryQuery = (input: HistoryQueryInput): HistoryQuery => ({
  filter: isHistoryFilter(input.filter) ? input.filter : 'all',
  page: normalizePage(input.page),
  pageSize: isHistoryPageSize(input.pageSize) ? input.pageSize : HISTORY_DEFAULT_PAGE_SIZE,
})
