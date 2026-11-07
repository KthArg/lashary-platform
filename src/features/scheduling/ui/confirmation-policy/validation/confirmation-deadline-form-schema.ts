import { z } from 'zod'
import { CONFIRMATION_DEADLINE_FIELD } from '../constants/confirmation-policy-strings'

const WHOLE_NUMBER = /^\d+$/

export const confirmationDeadlineFormSchema = z.object({
  [CONFIRMATION_DEADLINE_FIELD]: z.string().trim().regex(WHOLE_NUMBER),
})
