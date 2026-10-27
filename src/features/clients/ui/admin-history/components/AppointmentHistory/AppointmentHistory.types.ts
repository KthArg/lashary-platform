import type { AppointmentHistoryEntry } from '@/features/clients/domain/history/appointment-history.types'

export interface AppointmentHistoryProps {
  entries: readonly AppointmentHistoryEntry[]
}
