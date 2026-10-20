import { isErr, type Result } from '@/shared/result'
import type { StorageFailed } from '../../../domain/errors'
import { schedulingMessages } from '../../messages'
import { CONFIRM_FIELD, CONFIRM_VALUE } from '../constants/confirm-reduction.constants'
import type { AvailabilityActionState } from '../types/availability-action-state'

const affectedMessages = schedulingMessages.availability.affected

const submittedFields = (formData: FormData): Record<string, string> =>
  Object.fromEntries(
    Array.from(formData.entries()).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[0] !== CONFIRM_FIELD,
    ),
  )

export async function confirmationNeeded(
  formData: FormData,
  countAffected: () => Promise<Result<number, StorageFailed>>,
): Promise<AvailabilityActionState | null> {
  if (formData.get(CONFIRM_FIELD) === CONFIRM_VALUE) return null

  const affected = await countAffected()
  if (isErr(affected)) return { status: 'conflict', message: affectedMessages.countFailed }
  if (affected.value === 0) return null

  return {
    status: 'needsConfirmation',
    message: affectedMessages.warning(affected.value),
    affected: affected.value,
    fields: submittedFields(formData),
  }
}
