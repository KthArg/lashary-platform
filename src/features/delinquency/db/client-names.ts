import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { ClientNamesPort } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

// Contrato de `clients` (docs/contracts/clients-api.md): el nombre se pide por su función SQL, no por la tabla (ARCH-005).
export const CLIENT_NAMES_FUNCTION = 'clients_display_names'

const nameRowSchema = z.object({ client_id: z.string().uuid(), full_name: z.string() })

export function clientNames(db: SupabaseClient): ClientNamesPort {
  return {
    async namesFor(ids) {
      if (ids.length === 0) return ok(new Map<string, string>())
      const { data, error } = await db.rpc(CLIENT_NAMES_FUNCTION, { p_client_ids: ids })
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = z.array(nameRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(new Map(parsed.data.map((row) => [row.client_id, row.full_name])))
    },
  }
}
