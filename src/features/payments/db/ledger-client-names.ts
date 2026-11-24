import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err, type Result } from '@/shared/result'
import { paymentsStorageFailed, type PaymentsStorageFailed } from '../domain/errors'

export const CLIENT_NAMES_FUNCTION = 'clients_display_names'
export const CLIENT_NAMES_CHUNK_SIZE = 200

const nameRowSchema = z.object({ client_id: z.string(), full_name: z.string() })

export async function clientNamesFor(
  db: SupabaseClient,
  clientIds: readonly string[],
): Promise<Result<Map<string, string>, PaymentsStorageFailed>> {
  const names = new Map<string, string>()
  const uniqueIds = [...new Set(clientIds)]
  for (let start = 0; start < uniqueIds.length; start += CLIENT_NAMES_CHUNK_SIZE) {
    const chunk = uniqueIds.slice(start, start + CLIENT_NAMES_CHUNK_SIZE)
    const { data, error } = await db.rpc(CLIENT_NAMES_FUNCTION, { p_client_ids: chunk })
    if (error) return err(paymentsStorageFailed(error.message))
    const parsed = z.array(nameRowSchema).safeParse(data ?? [])
    if (!parsed.success) return err(paymentsStorageFailed('respuesta inesperada de los nombres'))
    for (const row of parsed.data) names.set(row.client_id, row.full_name)
  }
  return ok(names)
}
