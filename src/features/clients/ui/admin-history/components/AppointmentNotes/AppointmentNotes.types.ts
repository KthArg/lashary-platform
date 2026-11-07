import type { AppointmentNoteView } from '@/features/clients/application/notes/notes-by-appointment'

export interface AppointmentNotesProps {
  clientId: string
  appointmentId: string
  notes: readonly AppointmentNoteView[]
}

export interface NoteDraft {
  noteId: string | null
  body: string
}
