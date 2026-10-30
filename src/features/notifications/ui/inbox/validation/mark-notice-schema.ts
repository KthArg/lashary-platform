import { z } from 'zod'

export const markNoticeSchema = z.object({
  id: z.string().uuid(),
  read: z.boolean(),
})

export const loadMoreSchema = z.object({
  offset: z.number().int().min(0),
})
