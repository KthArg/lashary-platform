import { z } from 'zod'
import { CLOSE_OUTCOMES } from '@/features/scheduling/domain/appointment-closing.constants'

export const closeAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  outcome: z.enum(CLOSE_OUTCOMES),
  deliveredTechniqueId: z.string().uuid().optional(),
})
