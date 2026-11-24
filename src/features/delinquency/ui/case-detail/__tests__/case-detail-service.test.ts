import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, ok } from '@/shared/result'
import { caseNotFound, delinquencyStorageFailed } from '@/features/delinquency/domain/errors'
import type { CaseDetail } from '@/features/delinquency/domain/case-detail'

const loadCaseDetailMock = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: async () => ({}) }))
vi.mock('@/features/delinquency/application/load-case-detail', () => ({
  loadCaseDetail: () => loadCaseDetailMock,
}))
vi.mock('@/features/delinquency/db/case-detail-repository', () => ({ caseDetailRepository: () => ({}) }))
vi.mock('@/features/delinquency/db/client-names', () => ({ clientNames: () => ({}) }))
vi.mock('@/features/delinquency/http/appointment-summaries', () => ({ appointmentSummaries: () => ({}) }))
vi.mock('@/features/delinquency/http/audit-timeline', () => ({ auditTimeline: () => ({}) }))

import { caseDetailService } from '@/features/delinquency/ui/case-detail/services/case-detail-service'

const CASE_ID = '0b9c7f0e-6f2b-4c7e-8d57-6a1f3a2b9c10'

beforeEach(() => loadCaseDetailMock.mockReset())

describe('caseDetailService', () => {
  it('devuelve ready con el detalle cuando la lectura sale bien', async () => {
    const found = { caseId: CASE_ID } as CaseDetail
    loadCaseDetailMock.mockResolvedValue(ok(found))

    expect(await caseDetailService.load(CASE_ID)).toEqual({ status: 'ready', detail: found })
  })

  it('una morosidad inexistente es not_found y un fallo de base es error con el id', async () => {
    loadCaseDetailMock.mockResolvedValueOnce(err(caseNotFound(CASE_ID)))
    expect(await caseDetailService.load(CASE_ID)).toEqual({ status: 'not_found' })

    loadCaseDetailMock.mockResolvedValueOnce(err(delinquencyStorageFailed('caída')))
    expect(await caseDetailService.load(CASE_ID)).toEqual({ status: 'error', caseId: CASE_ID })
  })
})
