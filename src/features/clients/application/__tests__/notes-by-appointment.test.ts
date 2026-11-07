import { describe, it, expect } from 'vitest'
import { notesByAppointment } from '../notes/notes-by-appointment'
import { ANA_APPOINTMENT, NOTE_CREATED_AT, savedNote } from './note-fakes'

describe('notesByAppointment — las anotaciones de una página, cada una en su cita', () => {
  it('agrupa por cita y conserva el orden en que llegaron', () => {
    const grouped = notesByAppointment([
      savedNote({ id: 'note-1', body: 'Primera' }),
      savedNote({ id: 'note-2', appointmentId: 'appointment-otra', body: 'De otra cita' }),
      savedNote({ id: 'note-3', body: 'Segunda' }),
    ])
    expect(grouped.get(ANA_APPOINTMENT)?.map((note) => note.body)).toEqual(['Primera', 'Segunda'])
    expect(grouped.get('appointment-otra')?.map((note) => note.id)).toEqual(['note-2'])
  })

  it('pasa las fechas a milisegundos, como el inicio de la cita', () => {
    const [note] = notesByAppointment([savedNote()]).get(ANA_APPOINTMENT) ?? []
    expect(note).toEqual({ id: 'note-1', body: 'Prefiere la tarde', createdAtMs: NOTE_CREATED_AT.getTime(), updatedAtMs: NOTE_CREATED_AT.getTime() })
  })

  it('una cita sin anotaciones no aparece', () => {
    expect(notesByAppointment([]).size).toBe(0)
  })
})
