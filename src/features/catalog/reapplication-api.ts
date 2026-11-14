import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { createSupabaseTechniqueRepository } from './db/techniques/technique-repository'
import { listTechniques as listTechniquesUseCase } from './application/techniques/queries'
import type { ListTechniquesQuery } from './application/techniques/ports'

// Igual que reminders-api.ts de scheduling: el cron (US-NOT-05) no tiene cookies de sesión, así
// que necesita pasar su propio cliente de sistema en vez del `createClient()` de borde que usa
// `listTechniques` en index.ts para páginas y server actions.
export async function listTechniquesForReapplication(query?: ListTechniquesQuery, db?: SupabaseClient) {
  const repo = createSupabaseTechniqueRepository(db ?? (await createClient()))
  return listTechniquesUseCase(repo)(query)
}
