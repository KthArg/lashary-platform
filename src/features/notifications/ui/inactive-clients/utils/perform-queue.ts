import { z } from 'zod'
import { isErr, type Result } from '@/shared/result'
import type { InactiveQueueOutcome } from '@/features/notifications/domain/inactive-reminder'
import {
  isInactiveQueueEmpty,
  isInactiveQueueNotAllowed,
  isInactiveQueueTooMany,
} from '@/features/notifications/domain/errors'
import type { InactiveQueueFailure } from '@/features/notifications/application/ports'
import { INACTIVE_SEND_FIELDS, inactiveSendMessages as copy } from '../constants/inactive-send-strings'
import type { QueueActionState } from '../types/inactive-send.types'

export type QueueInactiveReminders = (clientIds: readonly string[]) => Promise<Result<InactiveQueueOutcome, InactiveQueueFailure>>

const clientIdsSchema = z.array(z.string().guid())

function messageFor(failure: InactiveQueueFailure): string {
  if (isInactiveQueueEmpty(failure)) return copy.empty
  if (isInactiveQueueTooMany(failure)) return copy.tooMany(failure.max)
  if (isInactiveQueueNotAllowed(failure)) return copy.notAllowed
  return copy.failed
}

function requestedIds(formData: FormData): unknown[] {
  const single = formData.get(INACTIVE_SEND_FIELDS.single)
  return single === null ? formData.getAll(INACTIVE_SEND_FIELDS.selected) : [single]
}

export async function performQueueInactiveReminders(
  queue: QueueInactiveReminders,
  formData: FormData,
): Promise<QueueActionState> {
  const ids = clientIdsSchema.safeParse(requestedIds(formData))
  if (!ids.success) return { status: 'error', message: copy.invalid }

  const result = await queue(ids.data)
  if (isErr(result)) return { status: 'error', message: messageFor(result.error) }
  return { status: 'success', message: copy.outcome(result.value) }
}
