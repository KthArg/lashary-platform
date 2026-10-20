import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { AlertKind, SchedulingAlert } from '../domain/alert'
import type { AlertsRepository } from '../application/ports'
import { ALERT_COLUMNS, ALERTS_TABLE } from './alerts-repository.constants'

type AlertRow = {
  id: string
  kind: AlertKind
  resource_id: string
  requested_from: string
  requested_until: string
  created_at: string
}

const toAlert = (row: AlertRow): SchedulingAlert => ({
  id: row.id,
  kind: row.kind,
  resourceId: row.resource_id,
  requestedFromMs: Date.parse(row.requested_from),
  requestedUntilMs: Date.parse(row.requested_until),
  createdAtMs: Date.parse(row.created_at),
})

export function createSupabaseAlertsRepository(db: SupabaseClient): AlertsRepository {
  return {
    async listRecent(limit) {
      const { data, error } = await db
        .from(ALERTS_TABLE)
        .select(ALERT_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) return err(storageFailed(error.message))
      return ok(((data ?? []) as AlertRow[]).map(toAlert))
    },
  }
}
