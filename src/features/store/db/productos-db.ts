import { createClient } from '@/shared/lib/supabase/server'
import type { ProductoPublico } from '../domain/producto'
import type { CatalogoProductosPublico } from '../application/obtener-grid-productos-publicos'

type FilaProductoDb = {
  id: string
  nombre: string
  url_imagen: string
  precio_crc: number
  activo: boolean
}

export class CatalogoProductosDb implements CatalogoProductosPublico {
  async listarProductosPublicos(): Promise<ProductoPublico[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('store_products')
      .select('id, nombre, url_imagen, precio_crc, activo')
      .eq('activo', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error('No se pudo leer el catálogo de productos desde la base de datos')
    }

    return (data ?? []).map((producto: FilaProductoDb) => ({
      id: producto.id,
      nombre: producto.nombre,
      urlImagen: producto.url_imagen,
      precioCrc: producto.precio_crc,
      activo: producto.activo,
    }))
  }
}
