import { addMoney, type Money, moneyFromColones, zeroMoney } from '@/shared/money'
import { ok, err, type Result } from '@/shared/result'
import {
  createDeliveryAddressRequired,
  createInvalidContactPhone,
  createInvalidRejectionReason,
  type DeliveryAddressRequired,
  type InvalidContactPhone,
  type InvalidRejectionReason,
} from './order-errors'

export const MIN_CONTACT_PHONE_LENGTH = 8
export const MAX_CONTACT_PHONE_LENGTH = 20
export const MAX_DELIVERY_ADDRESS_LENGTH = 300
export const MIN_REJECTION_REASON_LENGTH = 10
export const MAX_REJECTION_REASON_LENGTH = 500

export const DELIVERY_METHODS = ['pickup', 'shipping'] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

export const ORDER_STATES = ['pending_approval', 'approved', 'rejected'] as const
export type OrderState = (typeof ORDER_STATES)[number]

const checkoutDetailsBrand: unique symbol = Symbol('CheckoutDetails')

export interface CheckoutDetails {
  readonly [checkoutDetailsBrand]: true
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
}

export interface CheckoutDetailsInput {
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
}

export function buildCheckoutDetails(
  input: CheckoutDetailsInput,
): Result<CheckoutDetails, InvalidContactPhone | DeliveryAddressRequired> {
  const contactPhone = input.contactPhone.trim()
  if (contactPhone.length < MIN_CONTACT_PHONE_LENGTH || contactPhone.length > MAX_CONTACT_PHONE_LENGTH) {
    return err(createInvalidContactPhone())
  }

  if (input.deliveryMethod === 'pickup') {
    return ok({ [checkoutDetailsBrand]: true, contactPhone, deliveryMethod: 'pickup', deliveryAddress: null })
  }

  const deliveryAddress = (input.deliveryAddress ?? '').trim()
  if (deliveryAddress.length === 0 || deliveryAddress.length > MAX_DELIVERY_ADDRESS_LENGTH) {
    return err(createDeliveryAddressRequired())
  }
  return ok({ [checkoutDetailsBrand]: true, contactPhone, deliveryMethod: 'shipping', deliveryAddress })
}

export function validateRejectionReason(reason: string): Result<string, InvalidRejectionReason> {
  const trimmed = reason.trim()
  if (trimmed.length < MIN_REJECTION_REASON_LENGTH || trimmed.length > MAX_REJECTION_REASON_LENGTH) {
    return err(createInvalidRejectionReason())
  }
  return ok(trimmed)
}

export interface OrderLine {
  readonly productId: string
  readonly productName: string
  readonly unitPrice: Money
  readonly quantity: number
}

export function orderLineTotal(line: OrderLine): Money {
  return moneyFromColones(line.unitPrice.colones * line.quantity)
}

export function orderTotal(lines: readonly OrderLine[]): Money {
  return lines.reduce((total, line) => addMoney(total, orderLineTotal(line)), zeroMoney())
}

export interface Order {
  readonly id: string
  readonly state: OrderState
  readonly contactPhone: string
  readonly deliveryMethod: DeliveryMethod
  readonly deliveryAddress: string | null
  readonly total: Money
  readonly rejectionReason: string | null
  readonly createdAt: Date
  readonly lines: readonly OrderLine[]
}
