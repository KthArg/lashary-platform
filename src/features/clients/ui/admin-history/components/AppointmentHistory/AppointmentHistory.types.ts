import type { AppointmentHistoryEntryWithNotes } from '../../types/history-results'

export interface AppointmentHistoryProps {
  clientId: string
  entries: readonly AppointmentHistoryEntryWithNotes[]
}
