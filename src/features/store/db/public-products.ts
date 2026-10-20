import { createClient } from '@/shared/lib/supabase/server'
import type { PublicProduct } from '../domain/product'
import type { PublicProductCatalog } from '../application/public-grid/get-public-grid-state'

type PublicProductRow = {
  id: string
  slug: string
  nombre: string
  url_imagen: string
  precio_crc: number
  activo: boolean
}

export function publicProductsDb(): PublicProductCatalog {
  return {
    async listPublicProducts(): Promise<PublicProduct[]> {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('store_products')
        .select('id, slug, nombre, url_imagen, precio_crc, activo')
        .eq('activo', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error('No se pudo leer el catálogo de productos desde la base de datos')
      }

      return (data ?? []).map((product: PublicProductRow) => ({
        id: product.id,
        slug: product.slug,
        name: product.nombre,
        imageUrl: product.url_imagen,
        priceCrc: product.precio_crc,
        isActive: product.activo,
      }))
    },
  }
}
