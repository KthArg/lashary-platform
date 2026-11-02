import { z } from 'zod'
import { CANCELLABLE_STATUSES } from '../../../domain/appointment-cancellation.constants'

export const rescheduleRequestSchema = z.object({
  appointmentId: z.string().uuid(),
  newStartsAtMs: z.number().int().positive(),
  expectedStatus: z.enum(CANCELLABLE_STATUSES),
})
