import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseDailyAgendaRepository } from '../daily-agenda-repository'
import {
  APPOINTMENTS_TABLE,
  CLIENT_NAMES_FUNCTION,
  DAILY_AGENDA_COLUMNS,
} from '../appointment-repository.constants'
import { AGENDA_APPOINTMENT_STATUSES, DAILY_AGENDA_LIMIT } from '../../domain/daily-agenda.constants'

const FROM_MS = Date.parse('2027-03-01T06:00:00Z')
const UNTIL_MS = Date.parse('2027-03-02T06:00:00Z')

const bookedRow = {
  id: 'cita-1',
  status: 'confirmed',
  starts_at: '2027-03-01T16:00:00+00:00',
  ends_at: '2027-03-01T17:30:00+00:00',
  client_id: 'perfil-ana',
  technique_name: 'Clásicas',
  package_name: null,
  is_first_time: true,
  deposit_required: 10000,
  deposit_registered: 10000,
}
const staffRow = {
  id: 'cita-2',
  status: 'approved',
  starts_at: '2027-03-01T18:00:00+00:00',
  ends_at: '2027-03-01T19:00:00+00:00',
  client_id: null,
  technique_name: null,
  package_name: null,
  is_first_time: null,
  deposit_required: null,
  deposit_registered: 0,
}
const packageRow = {
  id: 'cita-3',
  status: 'approved',
  starts_at: '2027-03-01T20:00:00+00:00',
  ends_at: '2027-03-01T22:00:00+00:00',
  client_id: 'perfil-bea',
  technique_name: null,
  package_name: 'Cejas y pestañas clásico',
  is_first_time: null,
  deposit_required: 12000,
  deposit_registered: 0,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse, namesResponse: FakeResponse = { data: [], error: null }) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    in: (column: string, values: unknown) => (calls.push(['in', column, values]), query),
    gte: (column: string, value: unknown) => (calls.push(['gte', column, value]), query),
    lt: (column: string, value: unknown) => (calls.push(['lt', column, value]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    limit: async (count: number) => (calls.push(['limit', count]), response),
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), namesResponse),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseDailyAgendaRepository — US-AGE-11', () => {
  it('pide las citas del día que la agenda muestra, en orden y con tope, y los nombres en una sola llamada', async () => {
    const { db, calls } = createFakeDb(
      { data: [bookedRow, staffRow], error: null },
      { data: [{ client_id: 'perfil-ana', full_name: 'Ana Mora' }], error: null },
    )
    const result = await createSupabaseDailyAgendaRepository(db).listBetween(FROM_MS, UNTIL_MS)

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', DAILY_AGENDA_COLUMNS],
      ['in', 'status', [...AGENDA_APPOINTMENT_STATUSES]],
      ['gte', 'starts_at', '2027-03-01T06:00:00.000Z'],
      ['lt', 'starts_at', '2027-03-02T06:00:00.000Z'],
      ['order', 'starts_at', { ascending: true }],
      ['limit', DAILY_AGENDA_LIMIT + 1],
      ['rpc', CLIENT_NAMES_FUNCTION, { p_client_ids: ['perfil-ana'] }],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'cita-1',
        status: 'confirmed',
        startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T17:30:00Z'),
        clientId: 'perfil-ana',
        clientName: 'Ana Mora',
        techniqueName: 'Clásicas',
        isFirstTime: true,
        depositRequired: 10000,
        depositRegistered: 10000,
      },
      {
        id: 'cita-2',
        status: 'approved',
        startsAtMs: Date.parse('2027-03-01T18:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T19:00:00Z'),
        clientId: null,
        clientName: null,
        techniqueName: null,
        isFirstTime: null,
        depositRequired: null,
        depositRegistered: 0,
      },
    ])
  })

  it('una cita de paquete muestra el nombre del paquete como servicio (sin técnica)', async () => {
    const { db } = createFakeDb(
      { data: [packageRow], error: null },
      { data: [{ client_id: 'perfil-bea', full_name: 'Bea Rojas' }], error: null },
    )
    const result = await createSupabaseDailyAgendaRepository(db).listBetween(FROM_MS, UNTIL_MS)

    expect(isOk(result) && result.value[0].techniqueName).toBe('Cejas y pestañas clásico')
  })

  it('un día sin citas no pide nombres', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })
    const result = await createSupabaseDailyAgendaRepository(db).listBetween(FROM_MS, UNTIL_MS)

    expect(isOk(result) && result.value).toEqual([])
    expect(calls.some(([call]) => call === 'rpc')).toBe(false)
  })

  it('una clienta que el contrato no devuelve queda sin nombre, sin inventarlo', async () => {
    const { db } = createFakeDb({ data: [bookedRow], error: null }, { data: [], error: null })
    const result = await createSupabaseDailyAgendaRepository(db).listBetween(FROM_MS, UNTIL_MS)

    expect(isOk(result) && result.value[0].clientName).toBeNull()
  })

  it('un fallo al leer las citas o los nombres es StorageFailed, nunca una agenda vacía', async () => {
    const failedRead = createFakeDb({ data: null, error: { message: 'caída' } })
    const failedNames = createFakeDb({ data: [bookedRow], error: null }, { data: null, error: { message: 'caída' } })

    for (const { db } of [failedRead, failedNames]) {
      const result = await createSupabaseDailyAgendaRepository(db).listBetween(FROM_MS, UNTIL_MS)
      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    }
  })
})
