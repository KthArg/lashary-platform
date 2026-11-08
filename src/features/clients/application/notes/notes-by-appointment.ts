import type { AppointmentNote } from './note-ports'

export interface AppointmentNoteView {
  readonly id: string
  readonly body: string
  readonly createdAtMs: number
  readonly updatedAtMs: number
}

const toView = (note: AppointmentNote): AppointmentNoteView => ({
  id: note.id,
  body: note.body,
  createdAtMs: note.createdAt.getTime(),
  updatedAtMs: note.updatedAt.getTime(),
})

export function notesByAppointment(notes: readonly AppointmentNote[]): ReadonlyMap<string, AppointmentNoteView[]> {
  const grouped = new Map<string, AppointmentNoteView[]>()
  for (const note of notes) {
    const appointmentNotes = grouped.get(note.appointmentId) ?? []
    appointmentNotes.push(toView(note))
    grouped.set(note.appointmentId, appointmentNotes)
  }
  return grouped
}
