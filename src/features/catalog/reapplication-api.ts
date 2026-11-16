import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseTechniqueRepository } from './db/techniques/technique-repository'
import { listTechniques as listTechniquesUseCase } from './application/techniques/queries'
import type { ListTechniquesQuery } from './application/techniques/ports'

export async function listTechniquesForReapplication(query?: ListTechniquesQuery, db?: SupabaseClient) {
  const repo = createSupabaseTechniqueRepository(db ?? (await createClient()))
  return listTechniquesUseCase(repo)(query)
}
