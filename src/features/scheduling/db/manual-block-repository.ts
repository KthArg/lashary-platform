import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ManualBlock } from '../domain/manual-blocks'
import { manualBlockHasAppointment, manualBlockOverlap } from '../domain/availability-errors'
import type { ManualBlockRepository } from '../application/availability-ports'

const TABLE = 'scheduling_manual_blocks'
const COLUMNS = 'id, resource_id, starts_at, ends_at, reason'
const EXCLUSION_VIOLATION = '23P01'
const CHECK_VIOLATION = '23514'
const ACTIVE_APPOINTMENT_MESSAGE = 'scheduling_manual_blocks_active_appointment'
const SHORTEN_FUNCTION = 'scheduling_shorten_manual_block'
const NOT_FOUND_CODE = 'P0002'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  async function insertMany(blocks: readonly ManualBlock[]) {
    const { error } = await db.from(TABLE).insert(blocks.map(manualBlockToRow))
    if (!error) return ok(undefined)
    if (error.code === EXCLUSION_VIOLATION) return err(manualBlockOverlap())
    if (error.code === CHECK_VIOLATION && error.message === ACTIVE_APPOINTMENT_MESSAGE) {
      return err(manualBlockHasAppointment())
    }
    throw new Error(`${TABLE}.insert: ${error.message}`)
  }

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

    async findById(id) {
      if (!UUID.test(id)) return null
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToManualBlock(data as ManualBlockRow) : null
    },

    async shorten(id, newEndsAt) {
      if (!UUID.test(id)) return false
      const { error } = await db.rpc(SHORTEN_FUNCTION, { p_block_id: id, p_new_ends_at: newEndsAt.toISOString() })
      if (!error) return true
      if (error.code === NOT_FOUND_CODE) return false
      throw new Error(`${SHORTEN_FUNCTION}: ${error.message}`)
    },

    insert: (block) => insertMany([block]),

    insertMany,

    async remove(id) {
      if (!UUID.test(id)) return false
      const { data, error } = await db.from(TABLE).delete().eq('id', id).select('id')
      if (error) throw new Error(`${TABLE}.remove: ${error.message}`)
      return (data ?? []).length > 0
    },
  }
}

export async function manualBlockRepository(): Promise<ManualBlockRepository> {
  return createSupabaseManualBlockRepository(await createClient())
}
