import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadReview, type ReviewView } from '@/features/delinquency/application/load-review'
import { loadGraceDays } from '@/features/delinquency/application/grace-days'
import { caseListRepository } from '@/features/delinquency/db/case-list-repository'
import { clientNames } from '@/features/delinquency/db/client-names'
import { settingsRepository } from '@/features/delinquency/db/settings-repository'

// `graceDays` es null si no se pudo leer: la pantalla sigue y solo el formulario de la gracia dice que no está disponible.
export type ReviewViewModel = { status: 'error' } | { status: 'ready'; view: ReviewView; graceDays: number | null }

export const reviewService = {
  async load(): Promise<ReviewViewModel> {
    const db = await createClient()
    const [result, grace] = await Promise.all([
      loadReview({ cases: caseListRepository(db), names: clientNames(db) })(),
      loadGraceDays(settingsRepository(db))(),
    ])
    if (isErr(result)) return { status: 'error' }
    return { status: 'ready', view: result.value, graceDays: isErr(grace) ? null : grace.value }
  },
}
