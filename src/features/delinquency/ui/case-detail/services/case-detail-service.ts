import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadCaseDetail } from '@/features/delinquency/application/load-case-detail'
import type { CaseDetail } from '@/features/delinquency/domain/case-detail'
import { isCaseNotFound } from '@/features/delinquency/domain/errors'
import { caseDetailRepository } from '@/features/delinquency/db/case-detail-repository'
import { clientNames } from '@/features/delinquency/db/client-names'
import { appointmentSummaries } from '@/features/delinquency/http/appointment-summaries'
import { auditTimeline } from '@/features/delinquency/http/audit-timeline'

export type CaseDetailViewModel =
  | { status: 'error'; caseId: string }
  | { status: 'not_found' }
  | { status: 'ready'; detail: CaseDetail }

export const caseDetailService = {
  async load(caseId: string): Promise<CaseDetailViewModel> {
    const db = await createClient()
    const result = await loadCaseDetail({
      detail: caseDetailRepository(db),
      names: clientNames(db),
      appointments: appointmentSummaries(),
      timeline: auditTimeline(),
    })(caseId)
    if (isErr(result)) return isCaseNotFound(result.error) ? { status: 'not_found' } : { status: 'error', caseId }
    return { status: 'ready', detail: result.value }
  },
}
