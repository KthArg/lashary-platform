import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { ClientHistoryPort } from '../application/ports'
import { HAS_COMPLETED_APPOINTMENT_FUNCTION } from './client-history-repository.constants'

export function createSupabaseClientHistory(db: SupabaseClient): ClientHistoryPort {
  return {
    async hasCompletedAppointment(techniqueId) {
      const { data, error } = await db.rpc(HAS_COMPLETED_APPOINTMENT_FUNCTION, {
        p_technique_id: techniqueId,
      })

      if (error) return err(storageFailed(error.message))
      return ok(data === true)
    },
  }
}
