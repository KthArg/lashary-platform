import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  ATTEMPTS_BATCH_SIZE,
  createSupabasePaymentReminderFailureRepository,
  PAYMENT_REMINDER_FAILURES_TABLE,
} from '../payment-reminder-failure-repository'

const CLIENT_A = 'a1b2c3d4-0000-4000-8000-000000000001'
const CLIENT_B = 'a1b2c3d4-0000-4000-8000-000000000002'
const DAY = '2026-11-19'
const FAILED_AT = fixedDate('2026-11-19T17:00:00Z')

type Reply = { data?: unknown; error: unknown }

function createFakeDb(options: { selectReplies?: Reply[]; previous?: Reply; upsert?: Reply } = {}) {
  const calls = { tables: [] as string[], filters: [] as unknown[][], upserts: [] as unknown[][] }
  let nextSelectReply = 0
  const db = {
    from: (table: string) => {
      calls.tables.push(table)
      return {
        select: () => ({
          eq: (column: string, value: unknown) => {
            calls.filters.push([column, value])
            return {
              in: (inColumn: string, values: unknown) => {
                calls.filters.push([inColumn, values])
                return Promise.resolve(options.selectReplies?.[nextSelectReply++] ?? { data: [], error: null })
              },
              maybeSingle: () => Promise.resolve(options.previous ?? { data: null, error: null }),
            }
          },
        }),
        upsert: (row: unknown, config: unknown) => {
          calls.upserts.push([row, config])
          return Promise.resolve(options.upsert ?? { error: null })
        },
      }
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabasePaymentReminderFailureRepository', () => {
  describe('attemptsOn', () => {
    it('devuelve los intentos fallidos de hoy de cada clienta que ya falló', async () => {
      const { db, calls } = createFakeDb({ selectReplies: [{ data: [{ client_id: CLIENT_A, attempts: 3 }], error: null }] })

      const result = await createSupabasePaymentReminderFailureRepository(db).attemptsOn([CLIENT_A, CLIENT_B], DAY)

      expect(calls.tables).toEqual([PAYMENT_REMINDER_FAILURES_TABLE])
      expect(calls.filters).toEqual([
        ['attempt_day', DAY],
        ['client_id', [CLIENT_A, CLIENT_B]],
      ])
      expect(isOk(result) && result.value.get(CLIENT_A)).toBe(3)
      expect(isOk(result) && result.value.has(CLIENT_B)).toBe(false)
    })

    it('sin clientas no consulta la base', async () => {
      const { db, calls } = createFakeDb()

      const result = await createSupabasePaymentReminderFailureRepository(db).attemptsOn([], DAY)

      expect(calls.tables).toEqual([])
      expect(isOk(result) && result.value.size).toBe(0)
    })

    it('pide en lotes para no armar una consulta gigante', async () => {
      const clientIds = Array.from({ length: ATTEMPTS_BATCH_SIZE + 1 }, (_, index) => `cliente-${index}`)
      const { db, calls } = createFakeDb()

      await createSupabasePaymentReminderFailureRepository(db).attemptsOn(clientIds, DAY)

      expect(calls.tables).toHaveLength(2)
    })

    it('un error de la base o una fila inesperada son un fallo', async () => {
      const failing = createFakeDb({ selectReplies: [{ data: null, error: { message: 'boom' } }] })
      const unexpected = createFakeDb({ selectReplies: [{ data: [{ client_id: CLIENT_A }], error: null }] })

      expect(isErr(await createSupabasePaymentReminderFailureRepository(failing.db).attemptsOn([CLIENT_A], DAY))).toBe(true)
      expect(isErr(await createSupabasePaymentReminderFailureRepository(unexpected.db).attemptsOn([CLIENT_A], DAY))).toBe(true)
    })
  })

  describe('recordFailure', () => {
    const input = { clientId: CLIENT_A, day: DAY, error: 'whatsapp: timeout', failedAt: FAILED_AT }

    it('el primer fallo del día empieza en uno', async () => {
      const { db, calls } = createFakeDb()

      const result = await createSupabasePaymentReminderFailureRepository(db).recordFailure(input)

      expect(isOk(result)).toBe(true)
      expect(calls.upserts[0]?.[0]).toMatchObject({ client_id: CLIENT_A, attempt_day: DAY, attempts: 1, last_error: 'whatsapp: timeout' })
      expect(calls.upserts[0]?.[1]).toEqual({ onConflict: 'client_id' })
    })

    it('otro fallo el mismo día suma un intento', async () => {
      const { db, calls } = createFakeDb({ previous: { data: { attempt_day: DAY, attempts: 2 }, error: null } })

      await createSupabasePaymentReminderFailureRepository(db).recordFailure(input)

      expect(calls.upserts[0]?.[0]).toMatchObject({ attempts: 3 })
    })

    it('un fallo de otro día vuelve a contar desde uno', async () => {
      const { db, calls } = createFakeDb({ previous: { data: { attempt_day: '2026-11-18', attempts: 5 }, error: null } })

      await createSupabasePaymentReminderFailureRepository(db).recordFailure(input)

      expect(calls.upserts[0]?.[0]).toMatchObject({ attempts: 1 })
    })

    it('un error al leer, una fila inesperada o un error al escribir son un fallo', async () => {
      const readFails = createFakeDb({ previous: { data: null, error: { message: 'boom' } } })
      const unexpected = createFakeDb({ previous: { data: { attempts: 'x' }, error: null } })
      const writeFails = createFakeDb({ upsert: { error: { message: 'boom' } } })

      expect(isErr(await createSupabasePaymentReminderFailureRepository(readFails.db).recordFailure(input))).toBe(true)
      expect(isErr(await createSupabasePaymentReminderFailureRepository(unexpected.db).recordFailure(input))).toBe(true)
      expect(isErr(await createSupabasePaymentReminderFailureRepository(writeFails.db).recordFailure(input))).toBe(true)
    })
  })
})
