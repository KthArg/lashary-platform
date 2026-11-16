import { z } from 'zod'
import { GRACE_DAYS_MAX, GRACE_DAYS_MIN } from '@/features/delinquency/domain/grace-days'

export const graceDaysSchema = z.object({
  graceDays: z.number().int().min(GRACE_DAYS_MIN).max(GRACE_DAYS_MAX),
})
