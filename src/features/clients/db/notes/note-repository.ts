import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, type Result } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { AppointmentNote, NoteRepository, NoteStorageFailed } from '../../application/notes/note-ports'

export const APPOINTMENT_NOTES_TABLE = 'clients_appointment_notes'
export const FOREIGN_KEY_VIOLATION_CODE = '23503'
export const NOTE_COLUMNS = 'id, client_id, appointment_id, body, created_by, created_at, updated_at'

export interface AppointmentNoteRow {
  id: string
  client_id: string
  appointment_id: string
  body: string
  created_by: string
  created_at: string
  updated_at: string
}

function readDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function rowToNote(row: AppointmentNoteRow): Result<AppointmentNote, NoteStorageFailed> {
  const createdAt = readDate(row.created_at)
  const updatedAt = readDate(row.updated_at)
  if (!createdAt || !updatedAt) return err('storage-failed')
  return ok({
    id: row.id,
    clientId: row.client_id,
    appointmentId: row.appointment_id,
    body: row.body,
    createdBy: row.created_by,
    createdAt,
    updatedAt,
  })
}

async function withoutThrowing<T, E>(operation: () => Promise<Result<T, E>>): Promise<Result<T, E | NoteStorageFailed>> {
  try {
    return await operation()
  } catch {
    return err('storage-failed')
  }
}

export function createSupabaseNoteRepository(db: SupabaseClient): NoteRepository {
  return {
    add: (note) =>
      withoutThrowing(async () => {
        const { data, error } = await db
          .from(APPOINTMENT_NOTES_TABLE)
          .insert({
            client_id: note.clientId,
            appointment_id: note.appointmentId,
            body: note.body.text,
            created_by: note.createdBy,
          })
          .select(NOTE_COLUMNS)
          .single()
        if (error?.code === FOREIGN_KEY_VIOLATION_CODE) return err('appointment-not-of-client')
        if (error || !data) return err('storage-failed')
        return rowToNote(data as AppointmentNoteRow)
      }),

    updateBody: (noteId, clientId, body) =>
      withoutThrowing(async () => {
        const { data, error } = await db
          .from(APPOINTMENT_NOTES_TABLE)
          .update({ body: body.text })
          .eq('id', noteId)
          .eq('client_id', clientId)
          .select(NOTE_COLUMNS)
          .maybeSingle()
        if (error) return err('storage-failed')
        if (!data) return err('note-not-found')
        return rowToNote(data as AppointmentNoteRow)
      }),

    remove: (noteId, clientId) =>
      withoutThrowing(async () => {
        const { data, error } = await db
          .from(APPOINTMENT_NOTES_TABLE)
          .delete()
          .eq('id', noteId)
          .eq('client_id', clientId)
          .select('id')
        if (error || !data) return err('storage-failed')
        if (data.length === 0) return err('note-not-found')
        return ok(undefined)
      }),

    listForAppointments: (clientId, appointmentIds) =>
      withoutThrowing(async () => {
        if (appointmentIds.length === 0) return ok([])
        const { data, error } = await db
          .from(APPOINTMENT_NOTES_TABLE)
          .select(NOTE_COLUMNS)
          .eq('client_id', clientId)
          .in('appointment_id', [...appointmentIds])
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
        if (error || !data) return err('storage-failed')
        const notes: AppointmentNote[] = []
        for (const row of data as AppointmentNoteRow[]) {
          const note = rowToNote(row)
          if (!note.ok) return note
          notes.push(note.value)
        }
        return ok(notes)
      }),
  }
}

export async function noteRepository(): Promise<NoteRepository> {
  return createSupabaseNoteRepository(await createClient())
}
