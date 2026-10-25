import { isErr, type Result } from '@/shared/result'
import type { StorageFailed } from '../../../domain/errors'
import { schedulingMessages } from '../../messages'
import { APPOINTMENTS_PATH } from '../constants/availability.constants'
import type { AvailabilityActionState } from '../types/availability-action-state'

const availabilityMessages = schedulingMessages.availability

export async function rejectIfAppointments(
  countAffected: () => Promise<Result<number, StorageFailed>>,
): Promise<AvailabilityActionState | null> {
  const affected = await countAffected()
  if (isErr(affected)) return { status: 'conflict', message: availabilityMessages.affected.countFailed }
  if (affected.value === 0) return null

  return {
    status: 'conflict',
    message: availabilityMessages.affected.mustResolve(affected.value),
    link: { href: APPOINTMENTS_PATH, label: availabilityMessages.picker.goToAppointments },
  }
}
