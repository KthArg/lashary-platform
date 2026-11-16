import { z } from 'zod'
import { EXCEPTION_REASON_MAX_LENGTH } from '@/features/delinquency/domain/delinquency-case'

export const forgiveCaseSchema = z.object({
  caseId: z.string().uuid(),
  amount: z.number().int().positive(),
  reason: z.string().trim().min(1).max(EXCEPTION_REASON_MAX_LENGTH),
})
