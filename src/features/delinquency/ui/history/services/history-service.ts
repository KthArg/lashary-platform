import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { listCaseHistory } from '@/features/delinquency/application/list-case-history'
import type { CaseHistoryPage, HistoryQuery } from '@/features/delinquency/domain/case-history'
import { caseHistoryRepository } from '@/features/delinquency/db/case-history-repository'
import { clientNames } from '@/features/delinquency/db/client-names'
import { appointmentSummaries } from '@/features/delinquency/http/appointment-summaries'

export type HistoryViewModel = { status: 'error' } | { status: 'ready'; page: CaseHistoryPage }

export const historyService = {
  async load(query: HistoryQuery): Promise<HistoryViewModel> {
    const db = await createClient()
    const result = await listCaseHistory({
      history: caseHistoryRepository(db),
      names: clientNames(db),
      appointments: appointmentSummaries(),
    })(query)
    if (isErr(result)) return { status: 'error' }
    return { status: 'ready', page: result.value }
  },
}
