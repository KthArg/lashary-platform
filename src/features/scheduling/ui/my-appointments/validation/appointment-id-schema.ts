import { z } from 'zod'

export const appointmentIdSchema = z.string().uuid()
