import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildCartLine, type CartLine } from '../domain/cart'
import { sanitizeUrl } from '../domain/product'
import type { CartRepository } from '../application/cart/ports'

const TABLE = 'store_cart_items'
const PRODUCTS_TABLE = 'store_products'
const LINE_COLUMNS =
  'cantidad, created_at, store_products!inner(id, slug, nombre, url_imagen, precio_crc)'

type CartLineRow = {
  cantidad: number
  store_products: {
    id: string
    slug: string
    nombre: string
    url_imagen: string
    precio_crc: number | string
  }
}

function rowToLine(row: CartLineRow): CartLine {
  const product = row.store_products
  const built = buildCartLine(
    {
      id: product.id,
      slug: product.slug,
      name: product.nombre,
      imageUrl: sanitizeUrl(product.url_imagen),
      unitPrice: Money.fromColones(Number(product.precio_crc)),
    },
    row.cantidad,
  )
  if (!isOk(built)) {
    throw new Error(`fila inválida en ${TABLE} (${product.id}): ${built.error.message}`)
  }
  return built.value
}

export function createCartRepository(db: SupabaseClient): CartRepository {
  return {
    async listLines(userId: string): Promise<CartLine[]> {
      const { data, error } = await db
        .from(TABLE)
        .select(LINE_COLUMNS)
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
      if (error) throw new Error(`${TABLE}.listLines: ${error.message}`)
      return (data ?? []).map((row) => rowToLine(row as unknown as CartLineRow))
    },

    async findQuantity(userId: string, productId: string): Promise<number | null> {
      const { data, error } = await db
        .from(TABLE)
        .select('cantidad')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle()
      if (error) throw new Error(`${TABLE}.findQuantity: ${error.message}`)
      return data ? (data as { cantidad: number }).cantidad : null
    },

    async saveQuantity(userId: string, productId: string, quantity: number): Promise<void> {
      const { error } = await db
        .from(TABLE)
        .upsert(
          { user_id: userId, product_id: productId, cantidad: quantity },
          { onConflict: 'user_id,product_id' },
        )
      if (error) throw new Error(`${TABLE}.saveQuantity: ${error.message}`)
    },

    async remove(userId: string, productId: string): Promise<void> {
      const { error } = await db
        .from(TABLE)
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)
      if (error) throw new Error(`${TABLE}.remove: ${error.message}`)
    },

    async isProductActive(productId: string): Promise<boolean> {
      const { data, error } = await db
        .from(PRODUCTS_TABLE)
        .select('id')
        .eq('id', productId)
        .eq('activo', true)
        .maybeSingle()
      if (error) throw new Error(`${PRODUCTS_TABLE}.isProductActive: ${error.message}`)
      return data !== null
    },
  }
}

export async function cartRepository(): Promise<CartRepository> {
  return createCartRepository(await createClient())
}
