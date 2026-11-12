import { z } from 'zod'
import { CASE_DECISIONS } from '@/features/delinquency/domain/delinquency-case'

export const decideCaseSchema = z.object({
  caseId: z.string().uuid(),
  decision: z.enum(CASE_DECISIONS as [string, ...string[]]),
})
