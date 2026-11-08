import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { buildNoteBody, type NoteBody } from '../../domain/notes/note-body'
import {
  APPOINTMENT_NOTES_TABLE,
  APPOINTMENT_OF_CLIENT_MESSAGE,
  FOREIGN_KEY_VIOLATION_CODE,
  NOTE_COLUMNS,
  createSupabaseNoteRepository,
  type AppointmentNoteRow,
} from '../notes/note-repository'

type FakeResponse = { data: unknown; error: { code?: string; message: string } | null }

const CHAIN_METHODS = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'single', 'maybeSingle']

function fakeDb(response: FakeResponse | 'network-down') {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = {
    then: (resolve: (value: FakeResponse) => unknown, reject: (reason: unknown) => unknown) =>
      response === 'network-down' ? reject(new Error('fetch failed')) : resolve(response),
  }
  for (const method of CHAIN_METHODS) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { repo: createSupabaseNoteRepository(db), calls }
}

const ROW: AppointmentNoteRow = {
  id: 'note-1',
  client_id: 'client-ana',
  appointment_id: 'appointment-ana',
  body: 'Prefiere la tarde',
  created_by: 'admin-1',
  created_at: '2026-05-10T18:00:00+00:00',
  updated_at: '2026-05-11T09:30:00+00:00',
}

function body(text: string): NoteBody {
  const result = buildNoteBody(text)
  if (!isOk(result)) throw new Error('texto de prueba inválido')
  return result.value
}

const NEW_NOTE = { clientId: 'client-ana', appointmentId: 'appointment-ana', body: body('Prefiere la tarde'), createdBy: 'admin-1' }
const errorOf = (result: { ok: boolean; error?: unknown }) => (result.ok ? null : result.error)
const TRIGGER_REJECTION = {
  code: FOREIGN_KEY_VIOLATION_CODE,
  message: `clients_appointment_notes: la cita appointment-maria ${APPOINTMENT_OF_CLIENT_MESSAGE} client-ana`,
}
const PROFILE_FOREIGN_KEY = {
  code: FOREIGN_KEY_VIOLATION_CODE,
  message: 'insert or update on table "clients_appointment_notes" violates foreign key constraint "clients_appointment_notes_client_id_fkey"',
}

const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => consoleError.mockClear())

describe('add — guardar una anotación', () => {
  it('inserta las columnas de la tabla y devuelve la anotación con sus fechas', async () => {
    const { repo, calls } = fakeDb({ data: ROW, error: null })
    const result = await repo.add(NEW_NOTE)
    if (!isOk(result)) throw new Error('debería guardar')
    expect(calls).toEqual([
      ['from', APPOINTMENT_NOTES_TABLE],
      ['insert', { client_id: 'client-ana', appointment_id: 'appointment-ana', body: 'Prefiere la tarde', created_by: 'admin-1' }],
      ['select', NOTE_COLUMNS],
      ['single'],
    ])
    expect(result.value.createdAt).toEqual(new Date('2026-05-10T18:00:00Z'))
    expect(result.value.updatedAt).toEqual(new Date('2026-05-11T09:30:00Z'))
  })

  it('lee el rechazo del trigger como una cita que no es de la clienta', async () => {
    const { repo } = fakeDb({ data: null, error: TRIGGER_REJECTION })
    expect(errorOf(await repo.add(NEW_NOTE))).toBe('appointment-not-of-client')
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('otra llave foránea rota (clienta inexistente) no se confunde con el trigger: es storage-failed', async () => {
    const { repo } = fakeDb({ data: null, error: PROFILE_FOREIGN_KEY })
    expect(errorOf(await repo.add(NEW_NOTE))).toBe('storage-failed')
  })

  it('cualquier otro error de la base es storage-failed y deja la causa en el registro', async () => {
    const { repo } = fakeDb({ data: null, error: { code: '42501', message: 'permiso denegado' } })
    expect(errorOf(await repo.add(NEW_NOTE))).toBe('storage-failed')
    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('42501 permiso denegado'))
  })
})

describe('updateBody y remove — solo sobre la anotación de esa clienta', () => {
  it('editar filtra por id y por clienta, y cambia solo el texto', async () => {
    const { repo, calls } = fakeDb({ data: ROW, error: null })
    await repo.updateBody('note-1', 'client-ana', body('Prefiere la mañana'))
    expect(calls).toContainEqual(['update', { body: 'Prefiere la mañana' }])
    expect(calls).toContainEqual(['eq', 'id', 'note-1'])
    expect(calls).toContainEqual(['eq', 'client_id', 'client-ana'])
  })

  it('editar sin fila de vuelta es note-not-found', async () => {
    const { repo } = fakeDb({ data: null, error: null })
    expect(errorOf(await repo.updateBody('note-1', 'client-maria', body('Texto')))).toBe('note-not-found')
  })

  it('eliminar filtra por id y por clienta', async () => {
    const { repo, calls } = fakeDb({ data: [{ id: 'note-1' }], error: null })
    expect(isOk(await repo.remove('note-1', 'client-ana'))).toBe(true)
    expect(calls).toContainEqual(['delete'])
    expect(calls).toContainEqual(['eq', 'client_id', 'client-ana'])
  })

  it('eliminar sin filas borradas es note-not-found', async () => {
    const { repo } = fakeDb({ data: [], error: null })
    expect(errorOf(await repo.remove('note-1', 'client-maria'))).toBe('note-not-found')
  })
})

describe('listForAppointments — las anotaciones de una página en una sola consulta', () => {
  it('pide las de todas las citas juntas, de la clienta, de la más vieja a la más nueva', async () => {
    const { repo, calls } = fakeDb({ data: [ROW], error: null })
    const result = await repo.listForAppointments('client-ana', ['appointment-ana', 'appointment-2'])
    expect(isOk(result) && result.value.map((note) => note.id)).toEqual(['note-1'])
    expect(calls.filter(([method]) => method === 'from')).toHaveLength(1)
    expect(calls).toContainEqual(['in', 'appointment_id', ['appointment-ana', 'appointment-2']])
    expect(calls).toContainEqual(['eq', 'client_id', 'client-ana'])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: true }])
  })

  it('sin citas no consulta la base', async () => {
    const { repo, calls } = fakeDb({ data: [ROW], error: null })
    const result = await repo.listForAppointments('client-ana', [])
    expect(isOk(result) && result.value).toEqual([])
    expect(calls).toEqual([])
  })

  it('una fecha ilegible es storage-failed, no una fecha inventada', async () => {
    const { repo } = fakeDb({ data: [{ ...ROW, updated_at: 'no-es-fecha' }], error: null })
    expect(errorOf(await repo.listForAppointments('client-ana', ['appointment-ana']))).toBe('storage-failed')
  })
})

it('una caída de red es storage-failed en los cuatro métodos, sin lanzar', async () => {
  const { repo } = fakeDb('network-down')
  expect(errorOf(await repo.add(NEW_NOTE))).toBe('storage-failed')
  expect(errorOf(await repo.updateBody('note-1', 'client-ana', body('Texto')))).toBe('storage-failed')
  expect(errorOf(await repo.remove('note-1', 'client-ana'))).toBe('storage-failed')
  expect(errorOf(await repo.listForAppointments('client-ana', ['appointment-ana']))).toBe('storage-failed')
  expect(consoleError).toHaveBeenCalledTimes(4)
  expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('fetch failed'))
})
