import { z } from 'zod'
import type { ProductWrite } from '../../../application/admin-products/ports'
import { mensajesAdminProductos } from '../constants/product-strings'

const v = mensajesAdminProductos.form.validation

export const esquemaProductoAdmin = z
  .object({
    slug: z.string().trim().min(1, v.slug),
    name: z.string().trim().min(1, v.name),
    description: z.string().trim().optional().default(''),
    imageUrl: z.string().trim().min(1, v.imageUrl),
    priceCrc: z.coerce.number().int().positive(v.priceCrc),
    displayOrder: z.coerce.number().int().min(0, v.displayOrder),
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

export type EntradaFormularioProducto = z.input<typeof esquemaProductoAdmin>
