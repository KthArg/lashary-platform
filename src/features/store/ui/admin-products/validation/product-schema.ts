import { z } from 'zod'
import type { ProductWrite } from '../../../application/admin-products/ports'
import { slugFromName } from '../../../domain/product-slug'
import { productStrings } from '../constants/product-strings'

const validationMessages = productStrings.form.validation

export type ProductFormFields = Omit<ProductWrite, 'imageUrl'>

export const productSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, validationMessages.name)
      .refine((name) => slugFromName(name).length > 0, validationMessages.nameWithoutLetters),
    description: z.string().trim().optional().default(''),
    priceCrc: z.coerce.number().int().positive(validationMessages.priceCrc),
    displayOrder: z.coerce.number().int().min(0, validationMessages.displayOrder),
    stock: z
      .string({ message: validationMessages.stockRequired })
      .trim()
      .min(1, validationMessages.stockRequired)
      .transform(Number)
      .pipe(z.number().int(validationMessages.stock).min(0, validationMessages.stock)),
  })
  .transform(
    (data): ProductFormFields => ({
      name: data.name,
      description: data.description,
      priceCrc: data.priceCrc,
      displayOrder: data.displayOrder,
      stock: data.stock,
    }),
  )

export type ProductFormInput = z.input<typeof productSchema>
