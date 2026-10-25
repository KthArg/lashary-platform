import { z } from 'zod'
import { isCalendarDate } from '@/shared/studio-time'
import { CLOSED_DATE_KINDS } from '../../../domain/closed-dates'
import { SLOT_INTERVAL_MIN } from '@/features/scheduling/domain/day-slots'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '../../../domain/manual-blocks.constants'
import { MINUTES_PER_DAY } from '@/features/scheduling/domain/weekly-availability'
import { schedulingMessages } from '../../messages'

// Validación de formato en el borde, una sola vez (DOM-007). Las horas llegan como HH:MM del
// input type="time" y salen como minutos desde la medianoche; los invariantes de negocio
// (inicio antes del fin, no-solape) los aplica el dominio.

const validationMessages = schedulingMessages.availability.validation
const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/

export const timeToMinutes = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

// "24:00" no lo produce un input type="time"; un bloque hasta medianoche se escribe 00:00.
const timeField = z
  .string()
  .regex(HH_MM, validationMessages.time)
  .transform(timeToMinutes)

const endTimeField = timeField.transform((minutes) => (minutes === 0 ? 1440 : minutes))

const dateField = z.string().refine(isCalendarDate, validationMessages.date)

const optionalText = z
  .string()
  .optional()
  .transform((value) => value?.trim() || null)

const optionalReason = optionalText.refine(
  (reason) => reason === null || reason.length <= MAX_MANUAL_BLOCK_REASON_LENGTH,
  validationMessages.reasonTooLong,
)

export const weeklyBlockFormSchema = z.object({
  weekday: z.coerce.number().int(validationMessages.weekday).min(1, validationMessages.weekday).max(7, validationMessages.weekday),
  start: timeField,
  end: endTimeField,
})

export const closedDateFormSchema = z.object({
  date: dateField,
  kind: z.enum(CLOSED_DATE_KINDS, { message: validationMessages.kind }),
  label: optionalText,
})

export const manualBlockFormSchema = z.object({
  date: dateField,
  start: timeField,
  end: endTimeField,
  reason: optionalReason,
})

const slotStartField = z.string().regex(/^\d+$/, validationMessages.pickSlot).transform(Number)

const MAX_SLOTS_PER_DAY = MINUTES_PER_DAY / SLOT_INTERVAL_MIN

export const blockSlotsFormSchema = z.object({
  date: dateField,
  slotStartMinutes: z
    .array(slotStartField)
    .min(1, validationMessages.pickSlot)
    .max(MAX_SLOTS_PER_DAY, validationMessages.pickSlot),
  reason: optionalReason,
})

export const releaseSlotsFormSchema = z.object({
  date: dateField,
  slotStartMinutes: z
    .array(slotStartField)
    .min(1, validationMessages.pickSlot)
    .max(MAX_SLOTS_PER_DAY, validationMessages.pickSlot),
})

export const removeFormSchema = z.object({ id: z.string().min(1) })
