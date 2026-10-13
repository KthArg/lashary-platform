import { createClient } from '@/shared/lib/supabase/server'
import type { PublicProductDetailSource } from '../domain/product-detail'
import type { PublicProductDetailReader } from '../application/public-detail/get-public-product-detail'

const TABLE = 'store_products'
const COLUMNS = 'slug, nombre, descripcion, url_imagen, precio_crc, existencias, activo'

type PublicProductDetailRow = {
  slug: string
  nombre: string
  descripcion: string
  url_imagen: string
  precio_crc: number | string
  existencias: number
  activo: boolean
}

function rowToSource(row: PublicProductDetailRow): PublicProductDetailSource {
  return {
    slug: row.slug,
    name: row.nombre,
    description: row.descripcion,
    imageUrl: row.url_imagen,
    priceCrc: Number(row.precio_crc),
    stock: row.existencias,
    isActive: row.activo,
  }
}

export function publicProductDetailDb(): PublicProductDetailReader {
  return {
    async findBySlug(slug: string): Promise<PublicProductDetailSource | null> {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .eq('slug', slug)
        .eq('activo', true)
        .maybeSingle()

      if (error) throw new Error(`${TABLE}.findBySlug: ${error.message}`)
      return data ? rowToSource(data as PublicProductDetailRow) : null
    },
  }
}
