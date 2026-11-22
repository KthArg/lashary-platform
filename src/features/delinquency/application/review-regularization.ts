import { err, type Result } from '@/shared/result'
import { reviewRefused } from '../domain/errors'
import { isValidApprovedAmount, normalizeRejectionReason, type AccountCaseState } from '../domain/regularization'
import type { RegularizationReviewRepository, ReviewRegularizationFailure } from './ports'

export const approveRegularization =
  (repository: RegularizationReviewRepository) =>
  async (input: { requestId: string; approvedAmount: number }): Promise<Result<AccountCaseState, ReviewRegularizationFailure>> => {
    if (!isValidApprovedAmount(input.approvedAmount)) return err(reviewRefused('approved-amount-invalid'))
    return repository.approve(input.requestId, input.approvedAmount)
  }

export const rejectRegularization =
  (repository: RegularizationReviewRepository) =>
  async (input: { requestId: string; reason: string }): Promise<Result<void, ReviewRegularizationFailure>> => {
    const reason = normalizeRejectionReason(input.reason)
    if (reason === null) return err(reviewRefused('rejection-reason-required'))
    return repository.reject(input.requestId, reason)
  }
