import { z } from 'zod'
import type { ProductoEscritura } from '../application/productos-admin-puertos'
import { mensajesAdminProductos } from '../constants/mensajes-admin-productos'

const v = mensajesAdminProductos.form.validation

export const esquemaProductoAdmin = z
  .object({
    slug: z.string().trim().min(1, v.slug),
    nombre: z.string().trim().min(1, v.nombre),
    descripcion: z.string().trim().optional().default(''),
    urlImagen: z.string().trim().min(1, v.urlImagen),
    precioCrc: z.coerce.number().int().positive(v.precioCrc),
    ordenPresentacion: z.coerce.number().int().min(0, v.ordenPresentacion),
  })
  .transform(
    (data): ProductoEscritura => ({
      slug: data.slug,
      nombre: data.nombre,
      descripcion: data.descripcion,
      urlImagen: data.urlImagen,
      precioCrc: data.precioCrc,
      ordenPresentacion: data.ordenPresentacion,
    }),
  )

export type EntradaFormularioProducto = z.input<typeof esquemaProductoAdmin>
