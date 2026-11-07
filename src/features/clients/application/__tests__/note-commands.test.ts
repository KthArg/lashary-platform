import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { NOTE_LIMITS } from '../../domain/notes/note-limits'
import { addNote, deleteNote, editNote } from '../notes/note-commands'
import {
  ANA_APPOINTMENT,
  MARIA_APPOINTMENT,
  NOTE_ACTOR,
  NOTE_CREATED_AT,
  NOTE_UPDATED_AT,
  fakeNoteStore,
  savedNote,
} from './note-fakes'

const codeOf = (result: { ok: boolean; error?: { code: string } }) => (result.ok ? null : result.error?.code)
const mariasNote = () => savedNote({ clientId: 'client-maria', appointmentId: MARIA_APPOINTMENT })

describe('addNote — agregar una anotación a una cita (criterio 1)', () => {
  it('la guarda en la clienta del actor, firmada por quien la escribe y sin espacios en los extremos', async () => {
    const store = fakeNoteStore()
    const result = await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: '  Ojos irritados  ' })
    if (!isOk(result)) throw new Error('debería guardar')
    expect(result.value).toMatchObject({
      clientId: NOTE_ACTOR.clientId,
      appointmentId: ANA_APPOINTMENT,
      body: 'Ojos irritados',
      createdBy: NOTE_ACTOR.actorId,
    })
  })

  it('admite varias anotaciones en la misma cita', async () => {
    const store = fakeNoteStore()
    await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: 'Primera' })
    await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: 'Segunda' })
    expect(store.notes.map((note) => note.body)).toEqual(['Primera', 'Segunda'])
  })

  it('pasa el rechazo de la base cuando la cita es de otra clienta', async () => {
    const store = fakeNoteStore()
    const result = await addNote(store)(NOTE_ACTOR, { appointmentId: MARIA_APPOINTMENT, body: 'Cita ajena' })
    expect(codeOf(result)).toBe('appointment-not-of-client')
    expect(store.notes).toHaveLength(0)
  })
})

describe('editNote y deleteNote — editar y eliminar (criterios 1 y 3)', () => {
  it('editar cambia el texto y deja que la base mueva la fecha de modificación', async () => {
    const store = fakeNoteStore([savedNote()])
    const result = await editNote(store)(NOTE_ACTOR, { noteId: 'note-1', body: ' Prefiere la mañana ' })
    if (!isOk(result)) throw new Error('debería editar')
    expect(result.value).toMatchObject({ body: 'Prefiere la mañana', createdAt: NOTE_CREATED_AT, updatedAt: NOTE_UPDATED_AT })
  })

  it('eliminar la borra de verdad', async () => {
    const store = fakeNoteStore([savedNote()])
    expect(isOk(await deleteNote(store)(NOTE_ACTOR, { noteId: 'note-1' }))).toBe(true)
    expect(store.notes).toHaveLength(0)
  })

  it('no encuentra una anotación que no existe', async () => {
    const store = fakeNoteStore()
    expect(codeOf(await editNote(store)(NOTE_ACTOR, { noteId: 'note-404', body: 'Texto' }))).toBe('note-not-found')
    expect(codeOf(await deleteNote(store)(NOTE_ACTOR, { noteId: 'note-404' }))).toBe('note-not-found')
  })

  it('no toca la anotación de otra clienta aunque el id exista', async () => {
    const store = fakeNoteStore([mariasNote()])
    expect(codeOf(await editNote(store)(NOTE_ACTOR, { noteId: 'note-1', body: 'Texto' }))).toBe('note-not-found')
    expect(codeOf(await deleteNote(store)(NOTE_ACTOR, { noteId: 'note-1' }))).toBe('note-not-found')
    expect(store.notes).toEqual([mariasNote()])
  })
})

describe('las tres órdenes ante fallos', () => {
  it('devuelven el error de validación sin llegar al repositorio', async () => {
    const store = fakeNoteStore([savedNote()])
    const tooLong = 'x'.repeat(NOTE_LIMITS.bodyMaxLength + 1)
    expect(codeOf(await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: '   ' }))).toBe('CLIENTS_NOTE_INVALID')
    expect(codeOf(await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: tooLong }))).toBe('CLIENTS_NOTE_INVALID')
    expect(codeOf(await editNote(store)(NOTE_ACTOR, { noteId: 'note-1', body: '' }))).toBe('CLIENTS_NOTE_INVALID')
    expect(store.calls).toEqual([])
  })

  it('devuelven storage-failed cuando la base no responde, sin lanzar', async () => {
    const store = fakeNoteStore([savedNote()], { failing: true })
    expect(codeOf(await addNote(store)(NOTE_ACTOR, { appointmentId: ANA_APPOINTMENT, body: 'Nota' }))).toBe('storage-failed')
    expect(codeOf(await editNote(store)(NOTE_ACTOR, { noteId: 'note-1', body: 'Texto' }))).toBe('storage-failed')
    expect(codeOf(await deleteNote(store)(NOTE_ACTOR, { noteId: 'note-1' }))).toBe('storage-failed')
  })
})
