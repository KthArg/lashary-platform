import { ok, err } from '@/shared/result'
import type { AppointmentNote, NoteActor, NoteRepository } from '../notes/note-ports'

export const NOTE_ACTOR: NoteActor = { clientId: 'client-ana', actorId: 'admin-1' }
export const ANA_APPOINTMENT = 'appointment-ana'
export const MARIA_APPOINTMENT = 'appointment-maria'
export const NOTE_CREATED_AT = new Date('2026-05-10T18:00:00Z')
export const NOTE_UPDATED_AT = new Date('2026-05-11T09:30:00Z')

const APPOINTMENT_OWNERS: Readonly<Record<string, string>> = {
  [ANA_APPOINTMENT]: 'client-ana',
  [MARIA_APPOINTMENT]: 'client-maria',
}

export const savedNote = (overrides: Partial<AppointmentNote> = {}): AppointmentNote => ({
  id: 'note-1',
  clientId: 'client-ana',
  appointmentId: ANA_APPOINTMENT,
  body: 'Prefiere la tarde',
  createdBy: 'admin-1',
  createdAt: NOTE_CREATED_AT,
  updatedAt: NOTE_CREATED_AT,
  ...overrides,
})

export function fakeNoteStore(initialNotes: AppointmentNote[] = [], options: { failing?: boolean } = {}) {
  const notes = [...initialNotes]
  const calls: string[] = []
  const reached = (method: string) => {
    calls.push(method)
    return !options.failing
  }
  const indexOf = (noteId: string, clientId: string) =>
    notes.findIndex((note) => note.id === noteId && note.clientId === clientId)

  const repo: NoteRepository = {
    async add(newNote) {
      if (!reached('add')) return err('storage-failed')
      if (APPOINTMENT_OWNERS[newNote.appointmentId] !== newNote.clientId) return err('appointment-not-of-client')
      const note = savedNote({ ...newNote, id: `note-${notes.length + 1}`, body: newNote.body.text })
      notes.push(note)
      return ok(note)
    },
    async updateBody(noteId, clientId, body) {
      if (!reached('updateBody')) return err('storage-failed')
      const index = indexOf(noteId, clientId)
      if (index === -1) return err('note-not-found')
      notes[index] = { ...notes[index], body: body.text, updatedAt: NOTE_UPDATED_AT }
      return ok(notes[index])
    },
    async remove(noteId, clientId) {
      if (!reached('remove')) return err('storage-failed')
      const index = indexOf(noteId, clientId)
      if (index === -1) return err('note-not-found')
      notes.splice(index, 1)
      return ok(undefined)
    },
    async listForAppointments(clientId, appointmentIds) {
      if (!reached('listForAppointments')) return err('storage-failed')
      return ok(notes.filter((note) => note.clientId === clientId && appointmentIds.includes(note.appointmentId)))
    },
  }

  return { repo, notes, calls }
}
