import { z } from 'zod'
import type { Result } from '@/shared/result'
import { DELINQUENCY_ERROR_CODES, type DelinquencyStorageFailed } from '@/features/delinquency/domain/errors'
import { RECEIPT_MAX_BYTES } from '@/features/delinquency/domain/receipt'
import type { MyAccount, SubmitRegularizationInput } from '@/features/delinquency/application/submit-regularization'
import type { SubmitRegularizationFailure } from '@/features/delinquency/application/ports'
import type { UploadReceiptFailure } from '@/features/delinquency/application/upload-receipt'
import { receiptProblemMessages, refusalMessages, regularizationMessages } from '../constants/regularization-strings'
import type { LoadMyAccountResult, ReceiptUpload, SubmitRegularizationResult } from '../types/regularization-results'

export type RegularizationDeps = {
  isClient: () => Promise<boolean>
  submit: (input: SubmitRegularizationInput) => Promise<Result<string, SubmitRegularizationFailure | UploadReceiptFailure>>
  loadMyAccount: () => Promise<Result<MyAccount, DelinquencyStorageFailed>>
}

// El formulario manda texto: el monto llega como cadena y se exige entero positivo (los colones no tienen decimales).
const formSchema = z.object({
  caseId: z.string().guid(),
  declaredAmount: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
  reference: z.string().nullable().optional().transform((value) => value ?? null),
})

const isReceiptUpload = (value: unknown): value is ReceiptUpload =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as ReceiptUpload).size === 'number' &&
  typeof (value as ReceiptUpload).arrayBuffer === 'function'

function messageFor(error: SubmitRegularizationFailure | UploadReceiptFailure): string {
  switch (error.code) {
    case DELINQUENCY_ERROR_CODES.invalidReceipt:
      return receiptProblemMessages[error.problem]
    case DELINQUENCY_ERROR_CODES.regularizationRefused:
      return refusalMessages[error.reason]
    case DELINQUENCY_ERROR_CODES.notAClient:
      return regularizationMessages.accessDenied
    default:
      return regularizationMessages.storageFailed
  }
}

export async function performSubmitRegularization(
  fields: { caseId: unknown; declaredAmount: unknown; reference: unknown; receipt: unknown },
  deps: RegularizationDeps,
): Promise<SubmitRegularizationResult> {
  if (!(await deps.isClient())) return { ok: false, message: regularizationMessages.accessDenied }

  const parsed = formSchema.safeParse(fields)
  if (!parsed.success) return { ok: false, message: regularizationMessages.invalidForm }

  if (!isReceiptUpload(fields.receipt) || fields.receipt.size === 0) {
    return { ok: false, message: regularizationMessages.missingReceipt }
  }
  // El tamaño se revisa antes de leer el archivo; el contenido lo valida el caso de uso (DOM-008).
  if (fields.receipt.size > RECEIPT_MAX_BYTES) return { ok: false, message: receiptProblemMessages['receipt-too-large'] }

  const receipt = new Uint8Array(await fields.receipt.arrayBuffer())
  const submitted = await deps.submit({ ...parsed.data, receipt })
  if (!submitted.ok) return { ok: false, message: messageFor(submitted.error) }
  return { ok: true, message: regularizationMessages.sent }
}

export async function performLoadMyAccount(deps: RegularizationDeps): Promise<LoadMyAccountResult> {
  if (!(await deps.isClient())) return { ok: false, message: regularizationMessages.accessDenied }
  const account = await deps.loadMyAccount()
  if (!account.ok) return { ok: false, message: regularizationMessages.loadFailed }
  return { ok: true, account: account.value }
}
