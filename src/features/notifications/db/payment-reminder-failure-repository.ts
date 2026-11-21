import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { PaymentReminderFailurePort } from '../application/ports'

export const PAYMENT_REMINDER_FAILURES_TABLE = 'notifications_payment_reminder_failures'
export const ATTEMPTS_BATCH_SIZE = 100

const FAILED = 'repository-failed' as const
const FIRST_ATTEMPT = 1

const attemptRowsSchema = z.array(z.object({ client_id: z.string(), attempts: z.number().int() }))
const previousRowSchema = z.object({ attempt_day: z.string(), attempts: z.number().int() })

function batchesOf<Item>(items: readonly Item[], size: number): Item[][] {
  const batches: Item[][] = []
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size))
  return batches
}

export function createSupabasePaymentReminderFailureRepository(supabase: SupabaseClient): PaymentReminderFailurePort {
  return {
    async attemptsOn(clientIds, day) {
      const attempts = new Map<string, number>()

      for (const batch of batchesOf(clientIds, ATTEMPTS_BATCH_SIZE)) {
        const { data, error } = await supabase
          .from(PAYMENT_REMINDER_FAILURES_TABLE)
          .select('client_id, attempts')
          .eq('attempt_day', day)
          .in('client_id', batch)
        if (error) return err(FAILED)

        const parsed = attemptRowsSchema.safeParse(data ?? [])
        if (!parsed.success) return err(FAILED)

        for (const row of parsed.data) attempts.set(row.client_id, row.attempts)
      }

      return ok(attempts)
    },

    async recordFailure(input) {
      const previous = await supabase
        .from(PAYMENT_REMINDER_FAILURES_TABLE)
        .select('attempt_day, attempts')
        .eq('client_id', input.clientId)
        .maybeSingle()
      if (previous.error) return err(FAILED)

      const parsedPrevious = previous.data === null ? null : previousRowSchema.safeParse(previous.data)
      if (parsedPrevious !== null && !parsedPrevious.success) return err(FAILED)

      const isSameDay = parsedPrevious !== null && parsedPrevious.data.attempt_day === input.day
      const attempts = isSameDay ? parsedPrevious.data.attempts + 1 : FIRST_ATTEMPT
      const failedAt = input.failedAt.toISOString()
      const { error } = await supabase.from(PAYMENT_REMINDER_FAILURES_TABLE).upsert(
        {
          client_id: input.clientId,
          attempt_day: input.day,
          attempts,
          last_error: input.error,
          last_failed_at: failedAt,
          updated_at: failedAt,
        },
        { onConflict: 'client_id' },
      )
      if (error) return err(FAILED)
      return ok(undefined)
    },
  }
}

export async function paymentReminderFailureRepository(db?: SupabaseClient) {
  return createSupabasePaymentReminderFailureRepository(db ?? (await createClient()))
}
