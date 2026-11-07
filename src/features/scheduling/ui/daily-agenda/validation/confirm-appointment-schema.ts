import { z } from 'zod'

export const confirmAppointmentSchema = z.string().uuid()
