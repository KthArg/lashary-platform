import { isErr, type Result } from '@/shared/result'
import { buildCheckoutDetails, type DeliveryMethod } from '../../domain/order'
import type { DeliveryAddressRequired, InvalidContactPhone } from '../../domain/order-errors'
import type { CheckoutRefusal, CheckoutRepository } from './ports'
import type { UploadReceiptFailure } from './upload-receipt'

export type CheckoutInput = {
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
  readonly receipt: Uint8Array
}

export type CheckoutFailure =
  | InvalidContactPhone
  | DeliveryAddressRequired
  | UploadReceiptFailure
  | CheckoutRefusal

export type CheckoutDeps = {
  upload: (bytes: Uint8Array) => Promise<Result<string, UploadReceiptFailure>>
  repo: CheckoutRepository
}

export const checkout =
  ({ upload, repo }: CheckoutDeps) =>
  async (input: CheckoutInput): Promise<Result<string, CheckoutFailure>> => {
    const details = buildCheckoutDetails(input)
    if (isErr(details)) return details

    const receiptPath = await upload(input.receipt)
    if (isErr(receiptPath)) return receiptPath

    return repo.checkout({
      contactPhone: details.value.contactPhone,
      deliveryMethod: details.value.deliveryMethod,
      deliveryAddress: details.value.deliveryAddress,
      receiptPath: receiptPath.value,
    })
  }
