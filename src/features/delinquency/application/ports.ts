import type { Result } from '@/shared/result'
import type { CaseDecision, DelinquencyCase } from '../domain/delinquency-case'
import type { CaseAlreadyDecided, CaseNotFound, DelinquencyStorageFailed } from '../domain/errors'

export type DecideCaseFailure = DelinquencyStorageFailed | CaseNotFound | CaseAlreadyDecided

export interface CaseRepository {
  decide(caseId: string, decision: CaseDecision): Promise<Result<DelinquencyCase, DecideCaseFailure>>
}
