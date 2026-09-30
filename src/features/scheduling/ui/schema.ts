import { z } from 'zod'
import { DAYS_OF_WEEK, type DayOfWeek } from '../domain/availability'
import { schedulingMessages } from './messages'

// Validación de formato en el borde, una sola vez, con Zod (DOM-007). El invariante de negocio
// real (rango de hora válido, calendario, etc.) lo aplica el constructor de la entidad — acá
// solo se descartan formularios claramente incompletos o mal tipados antes de llegar ahí.

const v = schedulingMessages.validation

export const weeklyAvailabilityFormSchema = z
  .object({
    resourceId: z.string().trim().min(1),
    dayOfWeek: z.coerce
      .number()
      .int()
      .refine((value): value is DayOfWeek => (DAYS_OF_WEEK as readonly number[]).includes(value), v.dayOfWeek),
    startTime: z.string().trim().min(1, v.startTime),
    endTime: z.string().trim().min(1, v.endTime),
  })
  .transform((data) => ({
    resourceId: data.resourceId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
  }))

export const closedDateFormSchema = z
  .object({
    resourceId: z.string().trim().min(1),
    closedDate: z.string().trim().min(1, v.closedDate),
    reason: z.string().trim().optional(),
  })
  .transform((data) => ({
    resourceId: data.resourceId,
    closedDate: data.closedDate,
    reason: data.reason ? data.reason : undefined,
  }))

export const manualBlockFormSchema = z
  .object({
    resourceId: z.string().trim().min(1),
    startsAt: z.string().trim().min(1, v.startsAt),
    endsAt: z.string().trim().min(1, v.endsAt),
    reason: z.string().trim().optional(),
  })
  .transform((data) => ({
    resourceId: data.resourceId,
    startsAt: data.startsAt,
    endsAt: data.endsAt,
    reason: data.reason ? data.reason : undefined,
  }))
