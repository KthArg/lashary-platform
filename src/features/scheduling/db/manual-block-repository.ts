import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ManualBlock } from '../domain/manual-blocks'
import { manualBlockOverlap } from '../domain/availability-errors'
import type { ManualBlockRepository } from '../application/availability-ports'

const TABLE = 'scheduling_manual_blocks'
const COLUMNS = 'id, resource_id, starts_at, ends_at, reason'
const EXCLUSION_VIOLATION = '23P01'

export type ManualBlockRow = {
  id: string
  resource_id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

export const rowToManualBlock = (row: ManualBlockRow): ManualBlock => ({
  id: row.id,
  resourceId: row.resource_id,
  startsAt: new Date(row.starts_at),
  endsAt: new Date(row.ends_at),
  reason: row.reason,
})

export const manualBlockToRow = (block: ManualBlock): ManualBlockRow => ({
  id: block.id,
  resource_id: block.resourceId,
  starts_at: block.startsAt.toISOString(),
  ends_at: block.endsAt.toISOString(),
  reason: block.reason,
})

export function createSupabaseManualBlockRepository(db: SupabaseClient): ManualBlockRepository {
  return {
    async listEndingAfter(resourceId, after, limit) {
      const { data, error } = await db
        .from(TABLE)
        .select(COLUMNS)
        .eq('resource_id', resourceId)
        .gt('ends_at', after.toISOString())
        .order('starts_at', { ascending: true })
        .limit(limit)
      if (error) throw new Error(`${TABLE}.listEndingAfter: ${error.message}`)
      return (data ?? []).map((row) => rowToManualBlock(row as ManualBlockRow))
    },

    async insert(block) {
      const { error } = await db.from(TABLE).insert(manualBlockToRow(block))
      if (!error) return ok(undefined)
      if (error.code === EXCLUSION_VIOLATION) return err(manualBlockOverlap())
      throw new Error(`${TABLE}.insert: ${error.message}`)
    },
  }
}

export async function manualBlockRepository(): Promise<ManualBlockRepository> {
  return createSupabaseManualBlockRepository(await createClient())
}
