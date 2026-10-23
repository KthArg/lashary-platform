import { err, ok, type Result } from '@/shared/result'
import {
  MAX_CANCELLATION_WINDOW_HOURS,
  MIN_CANCELLATION_WINDOW_HOURS,
} from './cancellation-window.constants'
import { invalidCancellationWindow, type InvalidCancellationWindow } from './errors'

export function checkCancellationWindowHours(hours: number): Result<number, InvalidCancellationWindow> {
  const isWholeNumberInRange =
    Number.isInteger(hours) && hours >= MIN_CANCELLATION_WINDOW_HOURS && hours <= MAX_CANCELLATION_WINDOW_HOURS
  return isWholeNumberInRange ? ok(hours) : err(invalidCancellationWindow(hours))
}
