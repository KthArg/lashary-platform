import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { ActiveDebtsPort } from '../application/ports'

export const DELINQUENCY_LIST_ACTIVE_CASES_FUNCTION = 'delinquency_list_active_cases'
export const LIST_ACTIVE_CASES_PAGE_SIZE = 100

const FAILED = 'repository-failed' as const

const activeCaseRowsSchema = z.array(
  z.object({ case_id: z.string().uuid(), client_id: z.string().uuid(), pending: z.number().int(), since: z.string() }),
)

type PageCursor = { since: string; caseId: string }

export function activeDebtsGateway(db: SupabaseClient): ActiveDebtsPort {
  return {
    async listOwedByClient() {
      const owedByClient = new Map<string, number>()
      let cursor: PageCursor | null = null
      let hasMorePages = true

      while (hasMorePages) {
        const { data, error } = await db.rpc(DELINQUENCY_LIST_ACTIVE_CASES_FUNCTION, {
          p_limit: LIST_ACTIVE_CASES_PAGE_SIZE,
          p_after_since: cursor?.since ?? null,
          p_after_case_id: cursor?.caseId ?? null,
        })
        if (error) return err(FAILED)

        const parsed = activeCaseRowsSchema.safeParse(data ?? [])
        if (!parsed.success) return err(FAILED)

        for (const row of parsed.data) {
          if (row.pending > 0) owedByClient.set(row.client_id, (owedByClient.get(row.client_id) ?? 0) + row.pending)
        }

        const lastRow = parsed.data.at(-1)
        hasMorePages = parsed.data.length === LIST_ACTIVE_CASES_PAGE_SIZE && lastRow !== undefined
        cursor = lastRow === undefined ? null : { since: lastRow.since, caseId: lastRow.case_id }
      }

      return ok(owedByClient)
    },
  }
}
