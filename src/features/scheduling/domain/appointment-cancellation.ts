import { err, ok, type Result } from '@/shared/result'
import {
  CANCELLABLE_STATUSES,
  DEPOSIT_BEARING_STATUSES,
  MS_PER_HOUR,
} from './appointment-cancellation.constants'
import {
  appointmentNotCancellable,
  invalidCancellationInput,
  type AppointmentNotCancellable,
  type InvalidCancellationInput,
} from './errors'

export type CancellableStatus = (typeof CANCELLABLE_STATUSES)[number]

export type CancellationInput = {
  readonly appointmentId: string
  readonly status: string
  readonly startsAtMs: number
  readonly nowMs: number
  readonly windowHours: number
  readonly depositRequired: number
}

export type CancellationOutcome = {
  readonly withinWindow: boolean
  readonly forfeitedDeposit: number
}

const isCancellableStatus = (status: string): status is CancellableStatus =>
  (CANCELLABLE_STATUSES as readonly string[]).includes(status)

const bearsDeposit = (status: CancellableStatus): boolean =>
  (DEPOSIT_BEARING_STATUSES as readonly string[]).includes(status)

export function evaluateCancellation(
  input: CancellationInput,
): Result<CancellationOutcome, AppointmentNotCancellable | InvalidCancellationInput> {
  if (!Number.isSafeInteger(input.startsAtMs)) return err(invalidCancellationInput('startsAtMs'))
  if (!Number.isSafeInteger(input.nowMs)) return err(invalidCancellationInput('nowMs'))
  if (!Number.isInteger(input.windowHours) || input.windowHours < 0) {
    return err(invalidCancellationInput('windowHours'))
  }
  if (!Number.isInteger(input.depositRequired) || input.depositRequired < 0) {
    return err(invalidCancellationInput('depositRequired'))
  }

  if (!isCancellableStatus(input.status) || input.startsAtMs <= input.nowMs) {
    return err(appointmentNotCancellable(input.appointmentId))
  }

  const withinWindow = input.startsAtMs - input.nowMs >= input.windowHours * MS_PER_HOUR
  const losesDeposit = !withinWindow && bearsDeposit(input.status)

  return ok({ withinWindow, forfeitedDeposit: losesDeposit ? input.depositRequired : 0 })
}
