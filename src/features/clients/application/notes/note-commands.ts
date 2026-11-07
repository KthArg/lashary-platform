import { err, isErr, type Result } from '@/shared/result'
import { buildNoteBody } from '../../domain/notes/note-body'
import type { NoteValidationError } from '../../domain/notes/note-errors'
import type {
  AppointmentNote,
  AppointmentNotOfClient,
  NoteActor,
  NoteNotFound,
  NoteRepository,
  NoteStorageFailed,
} from './note-ports'

export interface NoteCommandFailure {
  readonly code: AppointmentNotOfClient | NoteNotFound | NoteStorageFailed
}

export type NoteCommandError = NoteCommandFailure | NoteValidationError

export type NoteCommandResult<T> = Result<T, NoteCommandError>

export interface NoteCommandDeps {
  readonly repo: NoteRepository
}

export interface AddNoteInput {
  readonly appointmentId: string
  readonly body: string
}

export interface EditNoteInput {
  readonly noteId: string
  readonly body: string
}

export interface DeleteNoteInput {
  readonly noteId: string
}

const failure = (code: NoteCommandFailure['code']): NoteCommandFailure => ({ code })

function asCommandResult<T>(result: Result<T, NoteCommandFailure['code']>): NoteCommandResult<T> {
  return isErr(result) ? err(failure(result.error)) : result
}

export const addNote =
  (deps: NoteCommandDeps) =>
  async (actor: NoteActor, input: AddNoteInput): Promise<NoteCommandResult<AppointmentNote>> => {
    const body = buildNoteBody(input.body)
    if (isErr(body)) return body
    const saved = await deps.repo.add({
      clientId: actor.clientId,
      appointmentId: input.appointmentId,
      body: body.value,
      createdBy: actor.actorId,
    })
    return asCommandResult(saved)
  }

export const editNote =
  (deps: NoteCommandDeps) =>
  async (actor: NoteActor, input: EditNoteInput): Promise<NoteCommandResult<AppointmentNote>> => {
    const body = buildNoteBody(input.body)
    if (isErr(body)) return body
    const saved = await deps.repo.updateBody(input.noteId, actor.clientId, body.value)
    return asCommandResult(saved)
  }

export const deleteNote =
  (deps: NoteCommandDeps) =>
  async (actor: NoteActor, input: DeleteNoteInput): Promise<NoteCommandResult<void>> => {
    const removed = await deps.repo.remove(input.noteId, actor.clientId)
    return asCommandResult(removed)
  }
