import type { AppointmentHistoryEntry } from '@/features/clients/domain/history/appointment-history.types'
import type { AppointmentNoteView } from '@/features/clients/application/notes/notes-by-appointment'

export type AppointmentHistoryEntryWithNotes = AppointmentHistoryEntry & {
  notes: AppointmentNoteView[]
}

export type ReadAppointmentHistoryResult =
  | {
      ok: true
      entries: AppointmentHistoryEntryWithNotes[]
      total: number
      page: number
      pageSize: number
    }
  | { ok: false; error: string; notFound?: true }

export type NoteActionResult = { ok: true } | { ok: false; error: string }
