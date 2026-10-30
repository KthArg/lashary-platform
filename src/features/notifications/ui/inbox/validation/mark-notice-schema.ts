import { z } from 'zod'

export const markNoticeSchema = z.object({
  id: z.string().uuid(),
  read: z.boolean(),
})
