import { z } from 'zod'
import { EXCEPTION_REASON_MAX_LENGTH } from '@/features/delinquency/domain/delinquency-case'

export const liftCaseSchema = z.object({
  caseId: z.string().uuid(),
  reason: z.string().trim().min(1).max(EXCEPTION_REASON_MAX_LENGTH),
})
