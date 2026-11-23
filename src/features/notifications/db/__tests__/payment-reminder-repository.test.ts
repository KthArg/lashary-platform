import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { createSupabasePaymentReminderRepository, LAST_SENT_BATCH_SIZE, PAYMENT_REMINDERS_TABLE } from '../payment-reminder-repository'

const CLIENT_A = 'a1b2c3d4-0000-4000-8000-000000000001'
const CLIENT_B = 'a1b2c3d4-0000-4000-8000-000000000002'
const SENT_AT = fixedDate('2026-11-17T12:00:00Z')

type Reply = { data?: unknown; error: unknown }

function createFakeDb(options: { selectReplies?: Reply[]; previous?: Reply; upsert?: Reply } = {}) {
  const calls = { tables: [] as string[], inFilters: [] as unknown[][], upserts: [] as unknown[][] }
  let nextSelectReply = 0
  const db = {
    from: (table: string) => {
      calls.tables.push(table)
      return {
        select: () => ({
          in: (column: string, values: unknown) => {
            calls.inFilters.push([column, values])
            return Promise.resolve(options.selectReplies?.[nextSelectReply++] ?? { data: [], error: null })
          },
          eq: () => ({ maybeSingle: () => Promise.resolve(options.previous ?? { data: null, error: null }) }),
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

describe('createSupabasePaymentReminderRepository', () => {
  describe('lastSentAt', () => {
    it('devuelve la fecha del último envío de cada clienta que ya recibió uno', async () => {
      const { db, calls } = createFakeDb({
        selectReplies: [{ data: [{ client_id: CLIENT_A, last_sent_at: SENT_AT.toISOString() }], error: null }],
      })

      const result = await createSupabasePaymentReminderRepository(db).lastSentAt([CLIENT_A, CLIENT_B])

      expect(calls.tables).toEqual([PAYMENT_REMINDERS_TABLE])
      expect(calls.inFilters).toEqual([['client_id', [CLIENT_A, CLIENT_B]]])
      expect(isOk(result) && result.value.get(CLIENT_A)).toEqual(SENT_AT)
      expect(isOk(result) && result.value.has(CLIENT_B)).toBe(false)
    })

    it('sin clientas no consulta la base', async () => {
      const { db, calls } = createFakeDb()

      const result = await createSupabasePaymentReminderRepository(db).lastSentAt([])

      expect(calls.tables).toEqual([])
      expect(isOk(result) && result.value.size).toBe(0)
    })

    it('pide en lotes para no armar una consulta gigante', async () => {
      const clientIds = Array.from({ length: LAST_SENT_BATCH_SIZE + 1 }, (_, index) => `cliente-${index}`)
      const { db, calls } = createFakeDb()

      await createSupabasePaymentReminderRepository(db).lastSentAt(clientIds)

      expect(calls.inFilters).toHaveLength(2)
    })

    it('un error de la base o una fila inesperada son un fallo', async () => {
      const failed = await createSupabasePaymentReminderRepository(createFakeDb({ selectReplies: [{ data: null, error: { message: 'boom' } }] }).db).lastSentAt([CLIENT_A])
      const malformed = await createSupabasePaymentReminderRepository(createFakeDb({ selectReplies: [{ data: [{ client_id: CLIENT_A }], error: null }] }).db).lastSentAt([CLIENT_A])

      expect(isErr(failed)).toBe(true)
      expect(isErr(malformed)).toBe(true)
    })
  })

  describe('recordSent', () => {
    const input = { clientId: CLIENT_A, amountOwed: 18000, channel: 'whatsapp' as const, sentAt: SENT_AT }

    it('el primer envío a una clienta guarda la fila con cuenta 1', async () => {
      const { db, calls } = createFakeDb()

      const result = await createSupabasePaymentReminderRepository(db).recordSent(input)

      expect(isOk(result)).toBe(true)
      expect(calls.upserts).toEqual([
        [
          {
            client_id: CLIENT_A,
            last_sent_at: SENT_AT.toISOString(),
            last_amount: 18000,
            last_channel: 'whatsapp',
            send_count: 1,
            updated_at: SENT_AT.toISOString(),
          },
          { onConflict: 'client_id' },
        ],
      ])
    })

    it('un envío posterior suma uno a la cuenta de la clienta', async () => {
      const { db, calls } = createFakeDb({ previous: { data: { send_count: 3 }, error: null } })

      await createSupabasePaymentReminderRepository(db).recordSent(input)

      expect((calls.upserts[0]?.[0] as { send_count: number }).send_count).toBe(4)
    })

    it('un error al leer la cuenta, una fila inesperada o un error al guardar son un fallo', async () => {
      const readFailed = await createSupabasePaymentReminderRepository(createFakeDb({ previous: { data: null, error: { message: 'boom' } } }).db).recordSent(input)
      const malformed = await createSupabasePaymentReminderRepository(createFakeDb({ previous: { data: { send_count: 'tres' }, error: null } }).db).recordSent(input)
      const writeFailed = await createSupabasePaymentReminderRepository(createFakeDb({ upsert: { error: { message: 'boom' } } }).db).recordSent(input)

      expect(isErr(readFailed)).toBe(true)
      expect(isErr(malformed)).toBe(true)
      expect(isErr(writeFailed)).toBe(true)
    })
  })
})
