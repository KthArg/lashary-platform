import type { Result } from '@/shared/result'
import type { DelinquencyCase } from '../domain/delinquency-case'
import type { CaseRepository, ForgiveCaseFailure } from './ports'

export type ForgiveCaseInput = {
  caseId: string
  amount: number
  reason: string
}

export const forgiveCase =
  (repository: CaseRepository) =>
  (input: ForgiveCaseInput): Promise<Result<DelinquencyCase, ForgiveCaseFailure>> =>
    repository.forgive(input.caseId, input.amount, input.reason)
