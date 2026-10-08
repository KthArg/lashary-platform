import { z } from 'zod'
import type { ProductWrite } from '../../../application/admin-products/ports'
import { productStrings } from '../constants/product-strings'

const v = productStrings.form.validation

export const productSchema = z
  .object({
    slug: z.string().trim().min(1, v.slug),
    name: z.string().trim().min(1, v.nombre),
    description: z.string().trim().optional().default(''),
    imageUrl: z.string().trim().min(1, v.urlImagen),
    priceCrc: z.coerce.number().int().positive(v.precioCrc),
    displayOrder: z.coerce.number().int().min(0, v.ordenPresentacion),
  })
  .transform(
    (data): ProductWrite => ({
      slug: data.slug,
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      priceCrc: data.priceCrc,
      displayOrder: data.displayOrder,
    }),
  )

export type ProductFormInput = z.input<typeof productSchema>
