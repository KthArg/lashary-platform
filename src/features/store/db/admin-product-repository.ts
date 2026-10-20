import type { SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildProduct, type AdminProduct } from '../domain/product'
import { createDuplicateProductSlug } from '../domain/product-errors'
import type { AdminProductRepository } from '../application/admin-products/ports'

const TABLE = 'store_products'
const COLUMNS = 'id, slug, nombre, descripcion, url_imagen, precio_crc, activo, sort_order, existencias'

type ProductRow = {
  id: string
  slug: string
  nombre: string
  descripcion: string
  url_imagen: string
  precio_crc: number | string
  activo: boolean
  sort_order: number
  existencias: number
}

function rowToDomain(row: ProductRow): AdminProduct {
  const built = buildProduct({
    id: row.id,
    slug: row.slug,
    name: row.nombre,
    description: row.descripcion,
    imageUrl: row.url_imagen,
    priceCrc: Number(row.precio_crc),
    displayOrder: row.sort_order,
    stock: row.existencias,
    isActive: row.activo,
  })
  if (!isOk(built)) {
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return built.value
}

function domainToRow(product: AdminProduct): ProductRow {
  return {
    id: product.id,
    slug: product.slug,
    nombre: product.name,
    descripcion: product.description,
    url_imagen: product.imageUrl,
    precio_crc: product.priceCrc,
    activo: product.isActive,
    sort_order: product.displayOrder,
    existencias: product.stock,
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
        items: (data ?? []).map((row) => rowToDomain(row as ProductRow)),
        total: count ?? 0,
      }
    },

    async findById(id: string): Promise<AdminProduct | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as ProductRow) : null
    },

    async listSlugsStartingWith(prefix: string): Promise<string[]> {
      const { data, error } = await db.from(TABLE).select('slug').like('slug', `${prefix}%`)
      if (error) throw new Error(`${TABLE}.listSlugsStartingWith: ${error.message}`)
      return (data ?? []).map((row: { slug: string }) => row.slug)
    },

    async save(product: AdminProduct): Promise<void> {
      const { error } = await db.from(TABLE).upsert(domainToRow(product), { onConflict: 'id' })
      if (error) {
        if (error.code === '23505') {
          throw createDuplicateProductSlug(product.slug)
        }
        throw new Error(`${TABLE}.save: ${error.message}`)
      }
    },
  }
}

export async function adminProductRepository(): Promise<AdminProductRepository> {
  return createAdminProductRepository(await createClient())
}
