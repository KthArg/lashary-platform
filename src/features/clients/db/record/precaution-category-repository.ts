import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { PrecautionCategory, PrecautionCategoryLookup } from '../../application/record/record-ports'

export const PRECAUTION_CATEGORIES_TABLE = 'clients_precaution_categories'

export function createSupabaseCategoryLookup(db: SupabaseClient): PrecautionCategoryLookup {
  return {
    async findCategory(categoryId) {
      const { data, error } = await db
        .from(PRECAUTION_CATEGORIES_TABLE)
        .select('id, name')
        .eq('id', categoryId)
        .maybeSingle()
      if (error) throw new Error('no se pudo leer la categoría de antecedentes')
      return data ? (data as PrecautionCategory) : null
    },
  }
}

export async function precautionCategoryLookup(): Promise<PrecautionCategoryLookup> {
  return createSupabaseCategoryLookup(await createClient())
}
