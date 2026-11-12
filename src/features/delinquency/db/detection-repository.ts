import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { DetectionRepository } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const DETECT_UNPAID_FUNCTION = 'delinquency_detect_unpaid'

const generatedSchema = z.number().int().min(0)

export function detectionRepository(db: SupabaseClient): DetectionRepository {
  return {
    async detectUnpaid() {
      const { data, error } = await db.rpc(DETECT_UNPAID_FUNCTION)
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = generatedSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },
  }
}
