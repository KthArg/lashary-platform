import type { Result } from '@/shared/result'
import type { DelinquencyCase } from '../domain/delinquency-case'
import type { CaseRepository, LiftCaseFailure } from './ports'

export type LiftCaseInput = {
  caseId: string
  reason: string
}

export const liftCase =
  (repository: CaseRepository) =>
  (input: LiftCaseInput): Promise<Result<DelinquencyCase, LiftCaseFailure>> =>
    repository.lift(input.caseId, input.reason)
