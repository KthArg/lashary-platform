import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseUnclosedAppointmentsRepository } from '../unclosed-appointments-repository'
import { UNCLOSED_APPOINTMENT_COLUMNS } from '../unclosed-appointments-repository.constants'
import { APPOINTMENTS_TABLE, CLIENT_NAMES_FUNCTION } from '../appointment-repository.constants'
import { CLOSABLE_STATUSES } from '../../domain/appointment-closing.constants'

const NOW_MS = Date.parse('2027-03-10T20:00:00Z')
const QUERY_LIMIT = 51

const bookedRow = {
  id: 'cita-1',
  status: 'approved',
  starts_at: '2027-03-09T16:00:00+00:00',
  ends_at: '2027-03-09T17:00:00+00:00',
  client_id: 'perfil-ana',
  technique_id: 'tecnica-1',
  is_first_time: true,
  technique_name: 'Clásicas',
  service_price: 15000,
  deposit_registered: 5000,
}
const staffRow = {
  ...bookedRow,
  id: 'cita-2',
  client_id: null,
  technique_id: null,
  is_first_time: null,
  technique_name: null,
  service_price: null,
  deposit_registered: 0,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse, namesResponse: FakeResponse = { data: [], error: null }) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    in: (column: string, values: unknown) => (calls.push(['in', column, values]), query),
    lte: (column: string, value: unknown) => (calls.push(['lte', column, value]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    limit: async (count: number) => (calls.push(['limit', count]), response),
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), namesResponse),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseUnclosedAppointmentsRepository — US-AGE-12 criterio 5', () => {
  it('pide las aprobadas y confirmadas que ya terminaron, de la más antigua a la más reciente, con tope', async () => {
    const { db, calls } = createFakeDb({ data: [bookedRow], error: null })

    await createSupabaseUnclosedAppointmentsRepository(db).listUnclosed(NOW_MS, QUERY_LIMIT)

    expect(calls.filter(([name]) => name !== 'rpc')).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', UNCLOSED_APPOINTMENT_COLUMNS],
      ['in', 'status', [...CLOSABLE_STATUSES]],
      ['lte', 'ends_at', new Date(NOW_MS).toISOString()],
      ['order', 'starts_at', { ascending: true }],
      ['limit', QUERY_LIMIT],
    ])
  })

  it('devuelve las citas con el nombre de la clienta; las del personal quedan sin clienta', async () => {
    const { db, calls } = createFakeDb(
      { data: [bookedRow, staffRow], error: null },
      { data: [{ client_id: 'perfil-ana', full_name: 'Ana Mora' }], error: null },
    )

    const result = await createSupabaseUnclosedAppointmentsRepository(db).listUnclosed(NOW_MS, QUERY_LIMIT)

    expect(isOk(result) && result.value).toEqual([
      {
        id: 'cita-1',
        status: 'approved',
        startsAtMs: Date.parse(bookedRow.starts_at),
        endsAtMs: Date.parse(bookedRow.ends_at),
        clientId: 'perfil-ana',
        clientName: 'Ana Mora',
        techniqueId: 'tecnica-1',
        isFirstTime: true,
        techniqueName: 'Clásicas',
        servicePrice: 15000,
        depositRegistered: 5000,
      },
      {
        id: 'cita-2',
        status: 'approved',
        startsAtMs: Date.parse(staffRow.starts_at),
        endsAtMs: Date.parse(staffRow.ends_at),
        clientId: null,
        clientName: null,
        techniqueId: null,
        isFirstTime: null,
        techniqueName: null,
        servicePrice: null,
        depositRegistered: 0,
      },
    ])
    expect(calls.filter(([name]) => name === 'rpc')).toEqual([
      ['rpc', CLIENT_NAMES_FUNCTION, { p_client_ids: ['perfil-ana'] }],
    ])
  })

  it('si la consulta falla, devuelve un error de almacenamiento sin lanzar', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection reset' } })

    const result = await createSupabaseUnclosedAppointmentsRepository(db).listUnclosed(NOW_MS, QUERY_LIMIT)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })

  it('si no se pueden leer los nombres, devuelve un error de almacenamiento', async () => {
    const { db } = createFakeDb({ data: [bookedRow], error: null }, { data: null, error: { message: 'sin permiso' } })

    const result = await createSupabaseUnclosedAppointmentsRepository(db).listUnclosed(NOW_MS, QUERY_LIMIT)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
