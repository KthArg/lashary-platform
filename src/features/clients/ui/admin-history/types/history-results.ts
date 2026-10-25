import type { AppointmentHistoryEntry } from '@/features/clients/domain/history/appointment-history.types'

export type ReadAppointmentHistoryResult =
  | {
      ok: true
      entries: AppointmentHistoryEntry[]
      total: number
      page: number
      pageSize: number
    }
  | { ok: false; error: string; notFound?: true }
