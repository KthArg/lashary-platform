import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseDayAvailabilityRepository } from '../day-availability-repository'

const RESOURCE = '00000000-0000-0000-0000-000000000a01'

function dbAnswering(answer: { data: unknown; error: { message: string } | null }) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (...args: unknown[]) => {
      calls.push(args)
      return answer
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('day-availability-repository — US-AGE-02', () => {
  it('lee el horario del día por scheduling_open_hours, no por la tabla', async () => {
    const { db, calls } = dbAnswering({ data: [{ start_min: 540, end_min: 720 }], error: null })
    const repo = createSupabaseDayAvailabilityRepository(db)

    expect(await repo.listOpenHours(RESOURCE, '2026-10-19')).toEqual([{ startMin: 540, endMin: 720 }])
    expect(calls).toEqual([['scheduling_open_hours', { p_resource_id: RESOURCE, p_day: '2026-10-19' }]])
  })

  it('lee lo ocupado por scheduling_busy_ranges y lo devuelve como instantes', async () => {
    const { db, calls } = dbAnswering({
      data: [{ starts_at: '2026-10-19T15:00:00+00:00', ends_at: '2026-10-19T16:00:00+00:00' }],
      error: null,
    })
    const repo = createSupabaseDayAvailabilityRepository(db)

    expect(await repo.listBusyRanges(RESOURCE, '2026-10-19')).toEqual([
      { startsAt: new Date('2026-10-19T15:00:00Z'), endsAt: new Date('2026-10-19T16:00:00Z') },
    ])
    expect(calls).toEqual([['scheduling_busy_ranges', { p_resource_id: RESOURCE, p_day: '2026-10-19' }]])
  })

  it('sin filas devuelve listas vacías', async () => {
    const repo = createSupabaseDayAvailabilityRepository(dbAnswering({ data: null, error: null }).db)
    expect(await repo.listOpenHours(RESOURCE, '2026-10-19')).toEqual([])
    expect(await repo.listBusyRanges(RESOURCE, '2026-10-19')).toEqual([])
  })

  it('un error de la base se lanza y sube al error.tsx de la ruta', async () => {
    const repo = createSupabaseDayAvailabilityRepository(
      dbAnswering({ data: null, error: { message: 'permission denied' } }).db,
    )
    await expect(repo.listOpenHours(RESOURCE, '2026-10-19')).rejects.toThrow('permission denied')
    await expect(repo.listBusyRanges(RESOURCE, '2026-10-19')).rejects.toThrow('permission denied')
  })
})
