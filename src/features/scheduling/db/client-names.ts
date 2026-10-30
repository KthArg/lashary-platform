import type { SupabaseClient } from '@supabase/supabase-js'
import { err, ok, type Result } from '@/shared/result'
import { storageFailed, type StorageFailed } from '../domain/errors'
import { CLIENT_NAMES_FUNCTION } from './appointment-repository.constants'

type ClientNameRow = { client_id: string; full_name: string }

export async function fetchClientNames(
  db: SupabaseClient,
  clientIds: readonly (string | null)[],
): Promise<Result<Map<string, string>, StorageFailed>> {
  const ids = [...new Set(clientIds.flatMap((id) => (id ? [id] : [])))]
  const names = new Map<string, string>()
  if (ids.length === 0) return ok(names)

  const { data, error } = await db.rpc(CLIENT_NAMES_FUNCTION, { p_client_ids: ids })
  if (error) return err(storageFailed(error.message))
  for (const row of (data ?? []) as ClientNameRow[]) names.set(row.client_id, row.full_name)
  return ok(names)
}
