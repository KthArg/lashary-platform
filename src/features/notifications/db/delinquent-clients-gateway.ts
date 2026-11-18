import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { DelinquentClientsPort } from '../application/ports'

export const DELINQUENCY_LIST_ACTIVE_FUNCTION = 'delinquency_list_active'
export const LIST_ACTIVE_PAGE_SIZE = 100

const FAILED = 'repository-failed' as const

const activeRowsSchema = z.array(z.object({ client_id: z.string().uuid(), since: z.string() }))

type PageCursor = { since: string; clientId: string }

export function delinquentClientsGateway(db: SupabaseClient): DelinquentClientsPort {
  return {
    async listActiveClientIds() {
      const clientIds: string[] = []
      let cursor: PageCursor | null = null
      let hasMorePages = true

      while (hasMorePages) {
        const { data, error } = await db.rpc(DELINQUENCY_LIST_ACTIVE_FUNCTION, {
          p_limit: LIST_ACTIVE_PAGE_SIZE,
          p_after_since: cursor?.since ?? null,
          p_after_client_id: cursor?.clientId ?? null,
        })
        if (error) return err(FAILED)

        const parsed = activeRowsSchema.safeParse(data ?? [])
        if (!parsed.success) return err(FAILED)

        clientIds.push(...parsed.data.map((row) => row.client_id))
        const lastRow = parsed.data.at(-1)
        hasMorePages = parsed.data.length === LIST_ACTIVE_PAGE_SIZE && lastRow !== undefined
        cursor = lastRow === undefined ? null : { since: lastRow.since, clientId: lastRow.client_id }
      }

      return ok(clientIds)
    },
  }
}
