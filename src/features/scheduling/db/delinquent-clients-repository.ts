import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { DelinquentClientsPort } from '../application/ports'

// `scheduling` no lee tablas de `delinquency` (ARCH-005): pide el estado de las clientas del día a la función
// por lote de su contrato (docs/contracts/delinquency-api.md). Una sola llamada por día, con los ids de la
// página (PERF-002, PERF-005). La agenda es de la administradora: la RLS de morosidad deja ver las filas a staff.
export const CLIENT_STATES_FUNCTION = 'delinquency_client_states'
export const ACTIVE_STATE = 'active'

const UNEXPECTED_RESPONSE = 'respuesta inesperada al consultar la morosidad de las clientas'

// `guid()` y no `uuid()`: Postgres acepta cualquier uuid y una respuesta válida no debe tumbar la agenda entera.
const statesSchema = z.array(z.object({ client_id: z.guid(), state: z.string() }))

export function createSupabaseDelinquentClientsPort(db: SupabaseClient): DelinquentClientsPort {
  return {
    async listWithActiveDelinquency(clientIds) {
      if (clientIds.length === 0) return ok(new Set<string>())

      const { data, error } = await db.rpc(CLIENT_STATES_FUNCTION, { p_client_ids: [...clientIds] })
      if (error) return err(storageFailed(error.message))
      const rows = statesSchema.safeParse(data ?? [])
      if (!rows.success) return err(storageFailed(UNEXPECTED_RESPONSE))

      // Solo `active` es morosidad activa: `pending_review` no tiene ninguna consecuencia (DOM-012).
      return ok(new Set(rows.data.filter((row) => row.state === ACTIVE_STATE).map((row) => row.client_id)))
    },
  }
}
