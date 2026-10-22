import { z } from 'zod'
import { CANCELLATION_WINDOW_FIELD } from '../constants/cancellation-policy-strings'

const WHOLE_NUMBER = /^\d+$/

export const cancellationWindowFormSchema = z.object({
  [CANCELLATION_WINDOW_FIELD]: z.string().trim().regex(WHOLE_NUMBER),
})
