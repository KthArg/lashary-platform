import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { CurrentClientPort, ReceiptStorage } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const RECEIPTS_BUCKET = 'delinquency-receipts'
export const CURRENT_PROFILE_FUNCTION = 'clients_current_profile_id'

// guid() y no uuid(): Postgres acepta cualquier uuid, y un id válido no debe frenar la subida.
const profileIdSchema = z.string().guid().nullable()

// Sube con la sesión de la clienta (nunca la service-role key, SEC-003): la política del bucket solo la deja
// escribir en su carpeta. upsert en false: un comprobante ya subido no se reemplaza.
export function receiptStorage(db: SupabaseClient): ReceiptStorage {
  return {
    async upload(path, file) {
      const { error } = await db.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, file.bytes, { contentType: file.contentType, upsert: false })
      if (error) return err(delinquencyStorageFailed(error.message))
      return ok(undefined)
    },
  }
}

// Quién es la clienta de la sesión se pregunta al contrato de clients (ARCH-005).
export function currentClient(db: SupabaseClient): CurrentClientPort {
  return {
    async currentClientId() {
      const { data, error } = await db.rpc(CURRENT_PROFILE_FUNCTION)
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = profileIdSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },
  }
}
