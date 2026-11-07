import type { AppointmentNoteView } from '@/features/clients/application/notes/notes-by-appointment'
import { NOTE_LABELS } from './constants/history-strings'
import { formatAppointmentDate } from './format-appointment-date'

export function noteDatesText(note: AppointmentNoteView): string {
  const created = NOTE_LABELS.created(formatAppointmentDate(note.createdAtMs))
  if (note.updatedAtMs === note.createdAtMs) return created
  return `${created} · ${NOTE_LABELS.edited(formatAppointmentDate(note.updatedAtMs))}`
}
