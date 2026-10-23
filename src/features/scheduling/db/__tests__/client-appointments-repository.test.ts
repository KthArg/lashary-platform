import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseClientAppointmentsRepository } from '../client-appointments-repository'
import { APPOINTMENTS_TABLE } from '../appointment-repository.constants'
import { CLIENT_APPOINTMENT_COLUMNS } from '../client-appointments-repository.constants'

const CLIENT_ID = 'perfil-ana'
const slice = { clientId: CLIENT_ID, offset: 25, limit: 25 }

const cancelledRow = {
  id: 'cita-2',
  starts_at: '2026-10-01T15:00:00+00:00',
  status: 'cancelled',
  technique_name: 'Volumen',
  deposit_required: 15000,
  deposit_registered: 0,
}

type FakeResponse = { data: unknown; error: { message: string } | null; count: number | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string, options: unknown) => (calls.push(['select', columns, options]), query),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    range: async (from: number, to: number) => (calls.push(['range', from, to]), response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseClientAppointmentsRepository', () => {
  it('pide solo las columnas del contrato, de la clienta, la más reciente primero y solo la página', async () => {
    const { db, calls } = createFakeDb({ data: [cancelledRow], error: null, count: 26 })
    const result = await createSupabaseClientAppointmentsRepository(db).listByClient(slice)

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', CLIENT_APPOINTMENT_COLUMNS, { count: 'exact' }],
      ['eq', 'client_id', CLIENT_ID],
      ['order', 'starts_at', { ascending: false }],
      ['order', 'id', { ascending: false }],
      ['range', 25, 49],
    ])
    expect(isOk(result) && result.value).toEqual({
      items: [
        {
          id: 'cita-2',
          startsAtMs: Date.parse('2026-10-01T15:00:00Z'),
          status: 'cancelled',
          techniqueName: 'Volumen',
          depositRequired: 15000,
          depositRegistered: 0,
        },
      ],
      total: 26,
    })
  })

  it('no pide datos de la decisión, del recurso ni de la elección', () => {
    for (const hiddenColumn of ['decided_by', 'decision_reason', 'resource_id', 'service_price', 'is_first_time']) {
      expect(CLIENT_APPOINTMENT_COLUMNS).not.toContain(hiddenColumn)
    }
  })

  it('una clienta sin citas es una página vacía con total 0', async () => {
    const { db } = createFakeDb({ data: [], error: null, count: 0 })
    const result = await createSupabaseClientAppointmentsRepository(db).listByClient(slice)

    expect(isOk(result) && result.value).toEqual({ items: [], total: 0 })
  })

  it('un fallo de la base es StorageFailed, no una página vacía', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' }, count: null })
    const result = await createSupabaseClientAppointmentsRepository(db).listByClient(slice)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
