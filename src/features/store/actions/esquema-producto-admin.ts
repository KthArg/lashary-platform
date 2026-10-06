import { z } from 'zod'
import type { ProductoEscritura } from '../application/productos-admin-puertos'
import { ORDEN_MINIMO, PRECIO_MINIMO_CRC } from '../domain/producto'
import { mensajesAdminProductos } from '../constants/mensajes-admin-productos'
import { CAMPOS_PRODUCTO } from '../constants/campos-producto-admin'

const v = mensajesAdminProductos.form.validation

export const esquemaProductoAdmin = z
  .object({
    [CAMPOS_PRODUCTO.slug]: z.string().trim().min(1, v.slug),
    [CAMPOS_PRODUCTO.nombre]: z.string().trim().min(1, v.nombre),
    [CAMPOS_PRODUCTO.descripcion]: z.string().trim().optional().default(''),
    [CAMPOS_PRODUCTO.urlImagen]: z.string().trim().min(1, v.urlImagen),
    [CAMPOS_PRODUCTO.precioCrc]: z.coerce.number().int().min(PRECIO_MINIMO_CRC, v.precioCrc),
    [CAMPOS_PRODUCTO.ordenPresentacion]: z.coerce.number().int().min(ORDEN_MINIMO, v.ordenPresentacion),
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
