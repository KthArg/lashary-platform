import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseReapplicationCandidatesRepository } from './db/reapplication-candidates-repository'
import { listReapplicationCandidates as listCandidates } from './application/reapplication-candidates'

export async function listReapplicationCandidates(db?: SupabaseClient) {
  const repo = createSupabaseReapplicationCandidatesRepository(db ?? (await createClient()))
  return listCandidates(repo)
}
