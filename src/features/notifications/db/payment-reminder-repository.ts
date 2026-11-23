import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { PaymentReminderLogPort } from '../application/ports'

export const PAYMENT_REMINDERS_TABLE = 'notifications_payment_reminders'
export const LAST_SENT_BATCH_SIZE = 100

const FAILED = 'repository-failed' as const
const FIRST_SEND_COUNT = 1

const lastSentRowsSchema = z.array(z.object({ client_id: z.string(), last_sent_at: z.string() }))
const sendCountRowSchema = z.object({ send_count: z.number().int() })

function batchesOf<Item>(items: readonly Item[], size: number): Item[][] {
  const batches: Item[][] = []
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size))
  return batches
}

export function createSupabasePaymentReminderRepository(supabase: SupabaseClient): PaymentReminderLogPort {
  return {
    async lastSentAt(clientIds) {
      const lastSent = new Map<string, Date>()

      for (const batch of batchesOf(clientIds, LAST_SENT_BATCH_SIZE)) {
        const { data, error } = await supabase.from(PAYMENT_REMINDERS_TABLE).select('client_id, last_sent_at').in('client_id', batch)
        if (error) return err(FAILED)

        const parsed = lastSentRowsSchema.safeParse(data ?? [])
        if (!parsed.success) return err(FAILED)

        for (const row of parsed.data) lastSent.set(row.client_id, new Date(row.last_sent_at))
      }

      return ok(lastSent)
    },

    async recordSent(input) {
      const previous = await supabase.from(PAYMENT_REMINDERS_TABLE).select('send_count').eq('client_id', input.clientId).maybeSingle()
      if (previous.error) return err(FAILED)

      const parsedPrevious = previous.data === null ? null : sendCountRowSchema.safeParse(previous.data)
      if (parsedPrevious !== null && !parsedPrevious.success) return err(FAILED)

      const sendCount = parsedPrevious === null ? FIRST_SEND_COUNT : parsedPrevious.data.send_count + 1
      const sentAt = input.sentAt.toISOString()
      const { error } = await supabase.from(PAYMENT_REMINDERS_TABLE).upsert(
        {
          client_id: input.clientId,
          last_sent_at: sentAt,
          last_amount: input.amountOwed,
          last_channel: input.channel,
          send_count: sendCount,
          updated_at: sentAt,
        },
        { onConflict: 'client_id' },
      )
      if (error) return err(FAILED)
      return ok(undefined)
    },
  }
}

export async function paymentReminderRepository(db?: SupabaseClient) {
  return createSupabasePaymentReminderRepository(db ?? (await createClient()))
}
