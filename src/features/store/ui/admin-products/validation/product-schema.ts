import { z } from 'zod'
import type { ProductWrite } from '../../../application/admin-products/ports'
import { productStrings } from '../constants/product-strings'

const validationMessages = productStrings.form.validation

export const productSchema = z
  .object({
    slug: z.string().trim().min(1, validationMessages.slug),
    name: z.string().trim().min(1, validationMessages.name),
    description: z.string().trim().optional().default(''),
    imageUrl: z.string().trim().min(1, validationMessages.imageUrl),
    priceCrc: z.coerce.number().int().positive(validationMessages.priceCrc),
    displayOrder: z.coerce.number().int().min(0, validationMessages.displayOrder),
    stock: z
      .string({ required_error: validationMessages.stockRequired })
      .trim()
      .min(1, validationMessages.stockRequired)
      .pipe(z.coerce.number().int(validationMessages.stock).min(0, validationMessages.stock)),
  })
  .transform(
    (data): ProductWrite => ({
      slug: data.slug,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      priceCrc: data.priceCrc,
      displayOrder: data.displayOrder,
      stock: data.stock,
    }),
  )

export type ProductFormInput = z.input<typeof productSchema>
