import { z } from 'zod'
import { EXCEPTION_REASON_MAX_LENGTH, FORGIVE_AMOUNT_MIN } from '@/features/delinquency/domain/delinquency-case'

export const forgiveCaseSchema = z.object({
  caseId: z.string().uuid(),
  amount: z.number().int().min(FORGIVE_AMOUNT_MIN),
  reason: z.string().trim().min(1).max(EXCEPTION_REASON_MAX_LENGTH),
})
