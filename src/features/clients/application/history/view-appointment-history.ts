import { isErr, ok, type Result } from '@/shared/result'
import { depositStatusOf } from '../../domain/history/deposit-status'
import type { AppointmentHistoryEntry, AppointmentHistoryRecord } from '../../domain/history/appointment-history.types'
import type { AppointmentHistoryQuery, AppointmentHistorySource } from './history-ports'

export interface AppointmentHistoryPage {
  readonly entries: readonly AppointmentHistoryEntry[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

const toEntry = (record: AppointmentHistoryRecord): AppointmentHistoryEntry => ({
  id: record.id,
  startsAtMs: record.startsAtMs,
  status: record.status,
  serviceName: record.serviceName,
  depositStatus: depositStatusOf(record),
})

export const viewAppointmentHistory =
  (source: AppointmentHistorySource) =>
  async (query: AppointmentHistoryQuery): Promise<Result<AppointmentHistoryPage, 'history-unavailable'>> => {
    const found = await source(query)
    if (isErr(found)) return found
    const { records, total, page, pageSize } = found.value
    return ok({ entries: records.map(toEntry), total, page, pageSize })
  }
