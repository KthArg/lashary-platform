import { z } from 'zod'
import { CLOSE_OUTCOMES } from '@/features/scheduling/domain/appointment-closing.constants'
import { CLOSE_AFTERCARE_NOTE_MAX_LENGTH } from '../constants/close-appointment.constants'

const optionalAftercareNote = z
  .string()
  .trim()
  .max(CLOSE_AFTERCARE_NOTE_MAX_LENGTH)
  .optional()
  .transform((note) => (note ? note : undefined))

export const closeAppointmentSchema = z
  .object({
    appointmentId: z.string().uuid(),
    outcome: z.enum(CLOSE_OUTCOMES),
    deliveredTechniqueId: z.string().uuid().optional(),
    aftercareNote: optionalAftercareNote,
  })
  .refine((closing) => closing.outcome !== 'no_show' || closing.aftercareNote === undefined, {
    path: ['aftercareNote'],
  })
