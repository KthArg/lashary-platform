import { z } from 'zod'
import { RESCHEDULE_LIMIT_FIELD } from '../constants/reschedule-policy-strings'

const WHOLE_NUMBER = /^\d+$/

export const rescheduleLimitFormSchema = z.object({
  [RESCHEDULE_LIMIT_FIELD]: z.string().trim().regex(WHOLE_NUMBER),
})
