import type { Result } from '@/shared/result'
import type { AppointmentHistoryRecord } from '../../domain/history/appointment-history.types'

export interface AppointmentHistoryQuery {
  readonly clientId: string
  readonly page?: number
}

export interface AppointmentHistoryRecordsPage {
  readonly records: readonly AppointmentHistoryRecord[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

export type AppointmentHistorySource = (
  query: AppointmentHistoryQuery,
) => Promise<Result<AppointmentHistoryRecordsPage, 'history-unavailable'>>
