import { ok, err, type Result } from '@/shared/result'
import {
  invalidBlockRangeError,
  invalidDateError,
  invalidDayOfWeekError,
  invalidTimeRangeError,
  type InvalidBlockRangeError,
  type InvalidDateError,
  type InvalidDayOfWeekError,
  type InvalidTimeRangeError,
} from './errors'

export const DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5, 6] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

const TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/

function toMinutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export interface WeeklyAvailabilityBlockProps {
  id?: string
  resourceId: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

export interface WeeklyAvailabilityBlock {
  readonly id?: string
  readonly resourceId: string
  readonly dayOfWeek: DayOfWeek
  readonly startTime: string
  readonly endTime: string
}

export function createWeeklyAvailabilityBlock(
  props: WeeklyAvailabilityBlockProps
): Result<WeeklyAvailabilityBlock, InvalidDayOfWeekError | InvalidTimeRangeError> {
  if (!DAYS_OF_WEEK.includes(props.dayOfWeek)) return err(invalidDayOfWeekError(props.dayOfWeek))
  if (!TIME_FORMAT.test(props.startTime) || !TIME_FORMAT.test(props.endTime)) {
    return err(invalidTimeRangeError(props.startTime, props.endTime))
  }
  if (toMinutesSinceMidnight(props.endTime) <= toMinutesSinceMidnight(props.startTime)) {
    return err(invalidTimeRangeError(props.startTime, props.endTime))
  }
  return ok({
    id: props.id,
    resourceId: props.resourceId,
    dayOfWeek: props.dayOfWeek,
    startTime: props.startTime,
    endTime: props.endTime,
  })
}

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/

export interface ClosedDateProps {
  id?: string
  resourceId: string
  closedDate: string
  reason?: string
}

export interface ClosedDate {
  readonly id?: string
  readonly resourceId: string
  readonly closedDate: string
  readonly reason?: string
}

export function createClosedDate(props: ClosedDateProps): Result<ClosedDate, InvalidDateError> {
  if (!DATE_FORMAT.test(props.closedDate)) return err(invalidDateError(props.closedDate))
  return ok({
    id: props.id,
    resourceId: props.resourceId,
    closedDate: props.closedDate,
    reason: props.reason,
  })
}

export interface ManualBlockProps {
  id?: string
  resourceId: string
  startsAt: Date
  endsAt: Date
  reason?: string
}

export interface ManualBlock {
  readonly id?: string
  readonly resourceId: string
  readonly startsAt: Date
  readonly endsAt: Date
  readonly reason?: string
}

export function createManualBlock(props: ManualBlockProps): Result<ManualBlock, InvalidBlockRangeError> {
  if (props.endsAt.getTime() <= props.startsAt.getTime()) return err(invalidBlockRangeError())
  return ok({
    id: props.id,
    resourceId: props.resourceId,
    startsAt: props.startsAt,
    endsAt: props.endsAt,
    reason: props.reason,
  })
}
