import { err, isErr, ok, type Result } from '@/shared/result'
import { regularizationRefused, type DelinquencyStorageFailed } from '../domain/errors'
import {
  checkRegularizationInput,
  normalizeReference,
  totalOwed,
  type AccountEntry,
  type RegularizationInput,
} from '../domain/regularization'
import type { RegularizationRepository, SubmitRegularizationFailure } from './ports'
import type { UploadReceiptFailure } from './upload-receipt'

export type SubmitRegularizationDeps = {
  upload: (bytes: Uint8Array) => Promise<Result<string, UploadReceiptFailure>>
  requests: RegularizationRepository
}

export type SubmitRegularizationInput = RegularizationInput & { readonly receipt: Uint8Array }

export const submitRegularization =
  ({ upload, requests }: SubmitRegularizationDeps) =>
  async (input: SubmitRegularizationInput): Promise<Result<string, SubmitRegularizationFailure | UploadReceiptFailure>> => {
    const refusal = checkRegularizationInput(input)
    if (refusal) return err(regularizationRefused(refusal))

    const receiptPath = await upload(input.receipt)
    if (isErr(receiptPath)) return receiptPath

    return requests.submit({
      caseId: input.caseId,
      declaredAmount: input.declaredAmount,
      reference: normalizeReference(input.reference),
      receiptPath: receiptPath.value,
    })
  }

export type MyAccount = {
  readonly entries: AccountEntry[]
  readonly totalOwed: number
}

export const loadMyAccount =
  (requests: RegularizationRepository) => async (): Promise<Result<MyAccount, DelinquencyStorageFailed>> => {
    const entries = await requests.myAccount()
    if (isErr(entries)) return entries
    return ok({ entries: entries.value, totalOwed: totalOwed(entries.value) })
  }
