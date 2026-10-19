import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseAlertsRepository } from '../alerts-repository'
import { ALERT_COLUMNS, ALERTS_TABLE } from '../alerts-repository.constants'

const LIMIT = 50
const row = {
  id: 'alerta-1',
  kind: 'appointment_overlap_rejected',
  resource_id: 'recurso-estudio',
  requested_from: '2027-03-01T16:00:00+00:00',
  requested_until: '2027-03-01T18:15:00+00:00',
  created_at: '2026-10-19T17:30:00+00:00',
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    limit: async (count: number) => (calls.push(['limit', count]), response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseAlertsRepository', () => {
  it('pide las más recientes primero, con tope, y sin la clienta', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const result = await createSupabaseAlertsRepository(db).listRecent(LIMIT)

    expect(calls).toEqual([
      ['from', ALERTS_TABLE],
      ['select', ALERT_COLUMNS],
      ['order', 'created_at', { ascending: false }],
      ['limit', LIMIT],
    ])
    expect(ALERT_COLUMNS).not.toContain('client_id')
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'alerta-1',
        kind: 'appointment_overlap_rejected',
        resourceId: 'recurso-estudio',
        requestedFromMs: Date.parse('2027-03-01T16:00:00Z'),
        requestedUntilMs: Date.parse('2027-03-01T18:15:00Z'),
        createdAtMs: Date.parse('2026-10-19T17:30:00Z'),
      },
    ])
  })

  it('sin filas es una lista vacía, y un fallo de la base es StorageFailed', async () => {
    const empty = await createSupabaseAlertsRepository(createFakeDb({ data: [], error: null }).db).listRecent(LIMIT)
    expect(isOk(empty) && empty.value).toEqual([])

    const failed = await createSupabaseAlertsRepository(
      createFakeDb({ data: null, error: { message: 'connection refused' } }).db,
    ).listRecent(LIMIT)
    expect(isErr(failed) && failed.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
