import type { Result } from '@/shared/result'
import type { CaseDecision, DelinquencyCase } from '../domain/delinquency-case'
import type { CaseRepository, DecideCaseFailure } from './ports'

export type DecideCaseInput = {
  caseId: string
  decision: CaseDecision
}

export const decideCase =
  (repository: CaseRepository) =>
  (input: DecideCaseInput): Promise<Result<DelinquencyCase, DecideCaseFailure>> =>
    repository.decide(input.caseId, input.decision)
