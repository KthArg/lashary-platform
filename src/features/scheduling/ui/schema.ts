import { z } from 'zod'
import { DAYS_OF_WEEK, type DayOfWeek } from '../domain/availability'
import { schedulingMessages } from './messages'
import { parseCostaRicaLocalDateTime } from './parse-local-datetime'

const v = schedulingMessages.validation

const requiredText = (message: string) =>
  z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message)

const optionalText = z
  .string({ invalid_type_error: v.reason })
  .trim()
  .optional()
  .transform((value) => value || undefined)

const costaRicaDateTime = (message: string) =>
  requiredText(message)
    .transform(parseCostaRicaLocalDateTime)
    .refine((date) => !Number.isNaN(date.getTime()), message)

const isDayOfWeek = (value: number): value is DayOfWeek => (DAYS_OF_WEEK as readonly number[]).includes(value)

const resourceId = requiredText(v.resourceId)

export const weeklyAvailabilityFormSchema = z.object({
  resourceId,
  dayOfWeek: z.coerce.number({ invalid_type_error: v.dayOfWeek }).int(v.dayOfWeek).refine(isDayOfWeek, v.dayOfWeek),
  startTime: requiredText(v.startTime),
  endTime: requiredText(v.endTime),
})

export const closedDateFormSchema = z.object({
  resourceId,
  closedDate: requiredText(v.closedDate),
  reason: optionalText,
})

export const manualBlockFormSchema = z.object({
  resourceId,
  startsAt: costaRicaDateTime(v.startsAt),
  endsAt: costaRicaDateTime(v.endsAt),
  reason: optionalText,
})
