import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { createSupabaseReapplicationReminderRepository } from '../reapplication-reminder-repository'

const CLIENT_A = 'a1b2c3d4-0000-4000-8000-000000000001'
const TECHNIQUE_1 = 'a1b2c3d4-0000-4000-8000-000000000002'
const LAST_COMPLETED_AT = fixedDate('2026-09-01T17:00:00Z')
const DUE_AT = fixedDate('2026-10-01T17:00:00Z')

type FakeTable = { select: unknown[]; upsert: unknown[] }

function createFakeDb(options: { selectResult?: { data: unknown; error: unknown }; upsertResult?: { error: unknown } } = {}) {
  const calls: FakeTable = { select: [], upsert: [] }
  const db = {
    from: () => ({
      select: (columns: string) => ({
        in: (column: string, values: unknown) => {
          calls.select.push({ columns, column, values })
          return Promise.resolve(options.selectResult ?? { data: [], error: null })
        },
      }),
      upsert: (row: unknown, opts: unknown) => {
        calls.upsert.push({ row, opts })
        return Promise.resolve(options.upsertResult ?? { error: null })
      },
    }),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseReapplicationReminderRepository', () => {
  describe('listRecords', () => {
    it('sin clientas no consulta la base', async () => {
      const { db, calls } = createFakeDb()
      const result = await createSupabaseReapplicationReminderRepository(db).listRecords([])

      expect(calls.select).toEqual([])
      expect(isOk(result) && result.value.size).toBe(0)
    })

    it('mapea cada fila a su clave de ciclo', async () => {
      const { db } = createFakeDb({
        selectResult: {
          data: [{ client_id: CLIENT_A, technique_id: TECHNIQUE_1, last_completed_at: LAST_COMPLETED_AT.toISOString(), status: 'sent', attempts: 1 }],
          error: null,
        },
      })

      const result = await createSupabaseReapplicationReminderRepository(db).listRecords([CLIENT_A])

      expect(isOk(result)).toBe(true)
      if (!isOk(result)) return
      expect(result.value.get(`${CLIENT_A}:${TECHNIQUE_1}:${LAST_COMPLETED_AT.toISOString()}`)).toEqual({ status: 'sent', attempts: 1 })
    })

    it('un error de la base es RepositoryFailure', async () => {
      const { db } = createFakeDb({ selectResult: { data: null, error: { message: 'boom' } } })
      const result = await createSupabaseReapplicationReminderRepository(db).listRecords([CLIENT_A])
      expect(isErr(result)).toBe(true)
    })
  })

  describe('recordSent', () => {
    it('hace upsert con el estado sent y la clave de ciclo como conflicto', async () => {
      const { db, calls } = createFakeDb()
      const result = await createSupabaseReapplicationReminderRepository(db).recordSent({
        clientId: CLIENT_A, techniqueId: TECHNIQUE_1, techniqueName: 'Clásico',
        lastCompletedAt: LAST_COMPLETED_AT, dueAt: DUE_AT, attempts: 1, channel: 'whatsapp', sentAt: DUE_AT,
      })

      expect(isOk(result)).toBe(true)
      expect(calls.upsert).toEqual([{
        row: {
          client_id: CLIENT_A, technique_id: TECHNIQUE_1, technique_name: 'Clásico',
          last_completed_at: LAST_COMPLETED_AT.toISOString(), due_at: DUE_AT.toISOString(),
          status: 'sent', attempts: 1, last_error: null, last_channel: 'whatsapp',
          sent_at: DUE_AT.toISOString(), updated_at: DUE_AT.toISOString(),
        },
        opts: { onConflict: 'client_id,technique_id,last_completed_at' },
      }])
    })

    it('un error de la base es RepositoryFailure', async () => {
      const { db } = createFakeDb({ upsertResult: { error: { message: 'boom' } } })
      const result = await createSupabaseReapplicationReminderRepository(db).recordSent({
        clientId: CLIENT_A, techniqueId: TECHNIQUE_1, techniqueName: 'Clásico',
        lastCompletedAt: LAST_COMPLETED_AT, dueAt: DUE_AT, attempts: 1, channel: 'whatsapp', sentAt: DUE_AT,
      })
      expect(isErr(result)).toBe(true)
    })
  })

  describe('recordFailed', () => {
    it('hace upsert con el estado failed y sent_at nulo', async () => {
      const { db, calls } = createFakeDb()
      const result = await createSupabaseReapplicationReminderRepository(db).recordFailed({
        clientId: CLIENT_A, techniqueId: TECHNIQUE_1, techniqueName: 'Clásico',
        lastCompletedAt: LAST_COMPLETED_AT, dueAt: DUE_AT, attempts: 2, error: 'fallo simulado', failedAt: DUE_AT,
      })

      expect(isOk(result)).toBe(true)
      expect(calls.upsert).toEqual([{
        row: {
          client_id: CLIENT_A, technique_id: TECHNIQUE_1, technique_name: 'Clásico',
          last_completed_at: LAST_COMPLETED_AT.toISOString(), due_at: DUE_AT.toISOString(),
          status: 'failed', attempts: 2, last_error: 'fallo simulado',
          sent_at: null, updated_at: DUE_AT.toISOString(),
        },
        opts: { onConflict: 'client_id,technique_id,last_completed_at' },
      }])
    })
  })
})
