import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import type { ClosedDate, ClosedDateKind } from '../domain/closed-dates'
import { closedDateAlreadyExists } from '../domain/availability-errors'
import type { ClosedDateRepository } from '../application/availability-ports'

const TABLE = 'scheduling_closed_dates'
const COLUMNS = 'id, resource_id, closed_on, kind, label'
const UNIQUE_VIOLATION = '23505'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ClosedDateRow = {
  id: string
  resource_id: string
  closed_on: string
  kind: ClosedDateKind
  label: string | null
}

export const rowToClosedDate = (row: ClosedDateRow): ClosedDate => ({
  id: row.id,
  resourceId: row.resource_id,
  date: row.closed_on,
  kind: row.kind,
  label: row.label,
})

export const closedDateToRow = (closedDate: ClosedDate): ClosedDateRow => ({
  id: closedDate.id,
  resource_id: closedDate.resourceId,
  closed_on: closedDate.date,
  kind: closedDate.kind,
  label: closedDate.label,
})

export function createSupabaseClosedDateRepository(db: SupabaseClient): ClosedDateRepository {
  return {
    async listFrom(resourceId, fromDate, limit) {
      const { data, error } = await db
        .from(TABLE)
        .select(COLUMNS)
        .eq('resource_id', resourceId)
        .gte('closed_on', fromDate)
        .order('closed_on', { ascending: true })
        .limit(limit)
      if (error) throw new Error(`${TABLE}.listFrom: ${error.message}`)
      return (data ?? []).map((row) => rowToClosedDate(row as ClosedDateRow))
    },

    async insert(closedDate) {
      const { error } = await db.from(TABLE).insert(closedDateToRow(closedDate))
      if (!error) return ok(undefined)
      if (error.code === UNIQUE_VIOLATION) return err(closedDateAlreadyExists(closedDate.date))
      throw new Error(`${TABLE}.insert: ${error.message}`)
    },

    async remove(id) {
      if (!UUID.test(id)) return false
      const { data, error } = await db.from(TABLE).delete().eq('id', id).select('id')
      if (error) throw new Error(`${TABLE}.remove: ${error.message}`)
      return (data ?? []).length > 0
    },
  }
}

export async function closedDateRepository(): Promise<ClosedDateRepository> {
  return createSupabaseClosedDateRepository(await createClient())
}
