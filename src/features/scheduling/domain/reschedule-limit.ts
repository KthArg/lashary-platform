import { err, ok, type Result } from '@/shared/result'
import { invalidRescheduleLimit, type InvalidRescheduleLimit } from './errors'
import { MAX_RESCHEDULE_LIMIT, MIN_RESCHEDULE_LIMIT } from './reschedule-limit.constants'

export function checkRescheduleLimit(max: number): Result<number, InvalidRescheduleLimit> {
  const isWholeNumberInRange = Number.isInteger(max) && max >= MIN_RESCHEDULE_LIMIT && max <= MAX_RESCHEDULE_LIMIT
  return isWholeNumberInRange ? ok(max) : err(invalidRescheduleLimit(max))
}
