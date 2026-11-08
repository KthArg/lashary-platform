'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { isErr, type Result } from '@/shared/result'
import { noteRepository } from '@/features/clients/db/notes/note-repository'
import {
  addNote,
  deleteNote,
  editNote,
  type NoteCommandDeps,
  type NoteCommandError,
  type NoteCommandFailure,
} from '@/features/clients/application/notes/note-commands'
import type { NoteActor } from '@/features/clients/application/notes/note-ports'
import { isNoteValidationError } from '@/features/clients/domain/notes/note-errors'
import { NOTE_ERROR_MESSAGES, NOTE_PROBLEM_MESSAGES } from '../constants/history-strings'
import type { NoteActionResult } from '../types/history-results'
import { clientAppointmentsPath, isUuid } from '../../client-routes'

const FAILURE_MESSAGES: Record<NoteCommandFailure['code'], string> = {
  'appointment-not-of-client': NOTE_ERROR_MESSAGES.appointmentNotOfClient,
  'note-not-found': NOTE_ERROR_MESSAGES.noteNotFound,
  'storage-failed': NOTE_ERROR_MESSAGES.storageFailed,
}

const readText = (value: unknown): string => (typeof value === 'string' ? value : '')

const failed = (error: string): NoteActionResult => ({ ok: false, error })

function toFailure(error: NoteCommandError): NoteActionResult {
  if (isNoteValidationError(error)) return failed(NOTE_PROBLEM_MESSAGES[error.problem])
  return failed(FAILURE_MESSAGES[error.code])
}

async function runNoteCommand(
  clientId: unknown,
  targetId: unknown,
  run: (deps: NoteCommandDeps, actor: NoteActor) => Promise<Result<unknown, NoteCommandError>>,
): Promise<NoteActionResult> {
  const session = await requireAdminSession()
  if (!isUuid(clientId) || !isUuid(targetId)) return failed(NOTE_ERROR_MESSAGES.invalidTarget)
  const actor = { clientId: clientId.toLowerCase(), actorId: session.user.id }
  try {
    const result = await run({ repo: await noteRepository() }, actor)
    if (isErr(result)) return toFailure(result.error)
    revalidatePath(clientAppointmentsPath(actor.clientId))
    return { ok: true }
  } catch {
    return failed(NOTE_ERROR_MESSAGES.storageFailed)
  }
}

export async function addNoteAction(clientId: string, appointmentId: string, body: string): Promise<NoteActionResult> {
  return runNoteCommand(clientId, appointmentId, (deps, actor) =>
    addNote(deps)(actor, { appointmentId: appointmentId.toLowerCase(), body: readText(body) }))
}

export async function editNoteAction(clientId: string, noteId: string, body: string): Promise<NoteActionResult> {
  return runNoteCommand(clientId, noteId, (deps, actor) =>
    editNote(deps)(actor, { noteId: noteId.toLowerCase(), body: readText(body) }))
}

export async function deleteNoteAction(clientId: string, noteId: string): Promise<NoteActionResult> {
  return runNoteCommand(clientId, noteId, (deps, actor) => deleteNote(deps)(actor, { noteId: noteId.toLowerCase() }))
}
