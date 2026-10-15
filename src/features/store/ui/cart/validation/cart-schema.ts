import { z } from 'zod'

export const cartProductSchema = z.object({
  productId: z.string().uuid(),
})

export const addToCartSchema = cartProductSchema.extend({
  quantity: z.coerce.number().int().optional(),
})

export const cartQuantitySchema = cartProductSchema.extend({
  quantity: z.coerce.number().int(),
})
