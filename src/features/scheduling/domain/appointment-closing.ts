import { err, ok, type Result } from '@/shared/result'
import {
  CLOSABLE_STATUSES,
  NO_AMOUNT,
  type ClosableStatus,
  type CloseOutcome,
} from './appointment-closing.constants'
import {
  appointmentNotClosable,
  invalidClosingAmount,
  type AppointmentNotClosable,
  type InvalidClosingAmount,
} from './errors'

export interface ClosableAppointment {
  readonly id: string
  readonly status: string
  readonly endsAtMs: number
  readonly techniqueId: string
  readonly servicePrice: number
  readonly depositRegistered: number
}

export interface DeliveredService {
  readonly techniqueId: string
  readonly price: number
}

export interface AppointmentClosing {
  readonly outcome: CloseOutcome
  readonly chargeAmount: number
  readonly depositCredit: number
  readonly amountDue: number
  readonly forfeitedDeposit: number
}

export type CloseError = AppointmentNotClosable | InvalidClosingAmount

const isClosableStatus = (status: string): status is ClosableStatus =>
  (CLOSABLE_STATUSES as readonly string[]).includes(status)

export function needsClosing(appointment: Pick<ClosableAppointment, 'status' | 'endsAtMs'>, nowMs: number): boolean {
  return isClosableStatus(appointment.status) && appointment.endsAtMs <= nowMs
}

const isWholeAmount = (amount: number): boolean => Number.isSafeInteger(amount) && amount >= NO_AMOUNT

export function closeAsCompleted(
  appointment: ClosableAppointment,
  deliveredService: DeliveredService,
  nowMs: number,
): Result<AppointmentClosing, CloseError> {
  if (!needsClosing(appointment, nowMs)) return err(appointmentNotClosable(appointment.id))

  const isReservedService = deliveredService.techniqueId === appointment.techniqueId
  const chargeAmount = isReservedService ? appointment.servicePrice : deliveredService.price
  const hasValidCharge = isWholeAmount(chargeAmount) && chargeAmount > NO_AMOUNT
  if (!hasValidCharge || !isWholeAmount(appointment.depositRegistered)) {
    return err(invalidClosingAmount(appointment.id))
  }

  return ok({
    outcome: 'completed',
    chargeAmount,
    depositCredit: appointment.depositRegistered,
    amountDue: chargeAmount - appointment.depositRegistered,
    forfeitedDeposit: NO_AMOUNT,
  })
}

export function closeAsNoShow(
  appointment: ClosableAppointment,
  nowMs: number,
): Result<AppointmentClosing, CloseError> {
  if (!needsClosing(appointment, nowMs)) return err(appointmentNotClosable(appointment.id))
  if (!isWholeAmount(appointment.depositRegistered)) return err(invalidClosingAmount(appointment.id))

  return ok({
    outcome: 'no_show',
    chargeAmount: NO_AMOUNT,
    depositCredit: NO_AMOUNT,
    amountDue: NO_AMOUNT,
    forfeitedDeposit: appointment.depositRegistered,
  })
}
