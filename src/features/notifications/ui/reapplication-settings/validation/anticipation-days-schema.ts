import { z } from 'zod'
import { REAPPLICATION_ANTICIPATION_DAYS_MAX, REAPPLICATION_ANTICIPATION_DAYS_MIN } from '@/features/notifications/domain/reapplication-reminder'

export const anticipationDaysSchema = z.object({
  anticipationDays: z.number().int().min(REAPPLICATION_ANTICIPATION_DAYS_MIN).max(REAPPLICATION_ANTICIPATION_DAYS_MAX),
})
