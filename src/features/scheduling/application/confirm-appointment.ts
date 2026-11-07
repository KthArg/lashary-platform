import { err, isErr, ok, type Result } from '@/shared/result'
import { checkConfirmationDeadlineHours } from '../domain/appointment-confirmation'
import type { InvalidConfirmationDeadline, StorageFailed } from '../domain/errors'
import type {
  AppointmentConfirmationRepository,
  ConfirmationError,
  ConfirmationPolicyRepository,
  ConfirmedAppointment,
} from './ports'

export type ChangeConfirmationDeadlineError = InvalidConfirmationDeadline | StorageFailed

export function confirmAppointment(confirmations: AppointmentConfirmationRepository) {
  return function confirm(appointmentId: string): Promise<Result<ConfirmedAppointment, ConfirmationError>> {
    return confirmations.confirm(appointmentId)
  }
}

export function getConfirmationDeadline(policy: ConfirmationPolicyRepository) {
  return function get(): Promise<Result<number, StorageFailed>> {
    return policy.getDeadlineHours()
  }
}

export function changeConfirmationDeadline(policy: ConfirmationPolicyRepository) {
  return async function change(hours: number): Promise<Result<number, ChangeConfirmationDeadlineError>> {
    const checked = checkConfirmationDeadlineHours(hours)
    if (isErr(checked)) return err(checked.error)

    const changed = await policy.changeDeadlineHours(checked.value)
    if (isErr(changed)) return err(changed.error)
    return ok(changed.value.newHours)
  }
}
