import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok, type Result } from '@/shared/result'
import { storageFailed, type StorageFailed } from '../domain/errors'
import type { AffectedAppointmentsRepository } from '../application/availability-ports'
import {
  COUNT_APPOINTMENTS_BY_WEEKLY_BLOCK_FUNCTION,
  COUNT_APPOINTMENTS_IN_RANGE_FUNCTION,
} from './affected-appointments-repository.constants'

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

function toCount(data: unknown, error: { message: string } | null): Result<number, StorageFailed> {
  if (error) return err(storageFailed(error.message))
  return typeof data === 'number' ? ok(data) : err(storageFailed(String(data)))
}

export function createSupabaseAffectedAppointmentsRepository(db: SupabaseClient): AffectedAppointmentsRepository {
  return {
    async countInRange({ resourceId, fromMs, toMs }) {
      const { data, error } = await db.rpc(COUNT_APPOINTMENTS_IN_RANGE_FUNCTION, {
        p_resource_id: resourceId,
        p_from: toIso(fromMs),
        p_to: toIso(toMs),
      })
      return toCount(data, error)
    },

    async countByWeeklyBlock(blockId) {
      const { data, error } = await db.rpc(COUNT_APPOINTMENTS_BY_WEEKLY_BLOCK_FUNCTION, { p_block_id: blockId })
      return toCount(data, error)
    },
  }
}
