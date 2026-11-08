import type { Result } from '@/shared/result'
import type { NoteBody } from '../../domain/notes/note-body'

export interface AppointmentNote {
  readonly id: string
  readonly clientId: string
  readonly appointmentId: string
  readonly body: string
  readonly createdBy: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface NewAppointmentNote {
  readonly clientId: string
  readonly appointmentId: string
  readonly body: NoteBody
  readonly createdBy: string
}

export type NoteStorageFailed = 'storage-failed'
export type AppointmentNotOfClient = 'appointment-not-of-client'
export type NoteNotFound = 'note-not-found'

export interface NoteRepository {
  add(note: NewAppointmentNote): Promise<Result<AppointmentNote, AppointmentNotOfClient | NoteStorageFailed>>
  updateBody(noteId: string, clientId: string, body: NoteBody): Promise<Result<AppointmentNote, NoteNotFound | NoteStorageFailed>>
  remove(noteId: string, clientId: string): Promise<Result<void, NoteNotFound | NoteStorageFailed>>
}

export interface NoteActor {
  readonly clientId: string
  readonly actorId: string
}
