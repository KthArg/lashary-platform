import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadReview, type ReviewView } from '@/features/delinquency/application/load-review'
import { caseListRepository } from '@/features/delinquency/db/case-list-repository'
import { clientNames } from '@/features/delinquency/db/client-names'

export type ReviewViewModel = { status: 'error' } | { status: 'ready'; view: ReviewView }

export const reviewService = {
  async load(): Promise<ReviewViewModel> {
    const db = await createClient()
    const result = await loadReview({ cases: caseListRepository(db), names: clientNames(db) })()
    if (isErr(result)) return { status: 'error' }
    return { status: 'ready', view: result.value }
  },
}
