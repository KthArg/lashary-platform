import { z } from 'zod'
import { isCalendarDate } from '@/shared/studio-time'
import { CLOSED_DATE_KINDS } from '../../../domain/closed-dates'
import { SLOT_INTERVAL_MIN } from '../../../domain/day-slots'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '../../../domain/manual-blocks.constants'
import { MINUTES_PER_DAY } from '../../../domain/weekly-availability'
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

// Un campo vacío no es el minuto 0: z.coerce.number() lo convertiría en 00:00 y bloquearía la
// medianoche. Se exigen dígitos antes de convertir.
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

// El fin que la administradora vio viaja con el formulario para que el servidor sepa si el bloqueo
// cambió; un valor que no es una fecha cuenta como bloqueo cambiado.
const expectedEndField = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), validationMessages.releaseSteps)
  .transform((value) => new Date(value))

export const releaseBlockFormSchema = z.object({
  id: z.string().min(1),
  steps: z.string().regex(/^\d+$/, validationMessages.releaseSteps).transform(Number),
  expectedEndsAt: expectedEndField,
})

export const removeFormSchema = z.object({ id: z.string().min(1) })
