import type { SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildProduct, type AdminProduct } from '../domain/product'
import { createDuplicateProductSlug } from '../domain/product-errors'
import type { AdminProductRepository } from '../application/admin-products/ports'

const TABLE = 'store_products'
const COLUMNS = 'id, slug, nombre, descripcion, url_imagen, precio_crc, activo, sort_order'

type ProductRow = {
  id: string
  slug: string
  nombre: string
  descripcion: string
  url_imagen: string
  precio_crc: number | string
  activo: boolean
  sort_order: number
}

function rowToDomain(fila: ProductRow): AdminProduct {
  const construido = buildProduct({
    id: fila.id,
    slug: fila.slug,
    name: fila.nombre,
    description: fila.descripcion,
    imageUrl: fila.url_imagen,
    priceCrc: Number(fila.precio_crc),
    displayOrder: fila.sort_order,
    activo: fila.activo,
  })
  if (!isOk(construido)) {
    throw new Error(`fila inválida en ${TABLE} (${fila.id}): ${construido.error.message}`)
  }
  return construido.value
}

function domainToRow(producto: AdminProduct): ProductRow {
  return {
    id: producto.id,
    slug: producto.slug,
    nombre: producto.name,
    descripcion: producto.description,
    url_imagen: producto.imageUrl,
    precio_crc: producto.priceCrc,
    activo: producto.activo,
    sort_order: producto.displayOrder,
  }
}

function createAdminProductRepository(db: SupabaseClient): AdminProductRepository {
  return {
    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let query = db
        .from(TABLE)
        .select(COLUMNS, { count: 'exact' })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1)

      if (params.activeOnly) query = query.eq('activo', true)

      const { data, error, count } = await query
      if (error) throw new Error(`${TABLE}.list: ${error.message}`)
      return {
        items: (data ?? []).map((fila) => rowToDomain(fila as ProductRow)),
        total: count ?? 0,
      }
    },

    async findById(id: string): Promise<AdminProduct | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as ProductRow) : null
    },

    async save(producto: AdminProduct): Promise<void> {
      const { error } = await db.from(TABLE).upsert(domainToRow(producto), { onConflict: 'id' })
      if (error) {
        if (error.code === '23505') {
          throw createDuplicateProductSlug(producto.slug)
        }
        throw new Error(`${TABLE}.save: ${error.message}`)
      }
    },
  }
}

export async function adminProductRepository(): Promise<AdminProductRepository> {
  return createAdminProductRepository(await createClient())
}
