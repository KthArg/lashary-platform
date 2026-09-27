import type { SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { construirProducto, type ProductoAdminVista } from '../domain/producto'
import { crearProductoSlugDuplicado } from '../domain/errores-producto'
import type { ProductoRepositorioAdmin } from '../application/productos-admin-puertos'

const TABLE = 'store_products'
const COLUMNS = 'id, slug, nombre, descripcion, url_imagen, precio_crc, activo, sort_order'

type Fila = {
  id: string
  slug: string
  nombre: string
  descripcion: string
  url_imagen: string
  precio_crc: number | string
  activo: boolean
  sort_order: number
}

function filaADominio(fila: Fila): ProductoAdminVista {
  const construido = construirProducto({
    id: fila.id,
    slug: fila.slug,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    urlImagen: fila.url_imagen,
    precioCrc: Number(fila.precio_crc),
    ordenPresentacion: fila.sort_order,
    activo: fila.activo,
  })
  if (!isOk(construido)) {
    throw new Error(`fila inválida en ${TABLE} (${fila.id}): ${construido.error.message}`)
  }
  return construido.value
}

function dominioAFila(producto: ProductoAdminVista): Fila {
  return {
    id: producto.id,
    slug: producto.slug,
    nombre: producto.nombre,
    descripcion: producto.descripcion,
    url_imagen: producto.urlImagen,
    precio_crc: producto.precioCrc,
    activo: producto.activo,
    sort_order: producto.ordenPresentacion,
  }
}

function crearRepositorioAdmin(db: SupabaseClient): ProductoRepositorioAdmin {
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
        items: (data ?? []).map((fila) => filaADominio(fila as Fila)),
        total: count ?? 0,
      }
    },

    async findById(id: string): Promise<ProductoAdminVista | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? filaADominio(data as Fila) : null
    },

    async save(producto: ProductoAdminVista): Promise<void> {
      const { error } = await db.from(TABLE).upsert(dominioAFila(producto), { onConflict: 'id' })
      if (error) {
        if (error.code === '23505') {
          throw crearProductoSlugDuplicado(producto.slug)
        }
        throw new Error(`${TABLE}.save: ${error.message}`)
      }
    },
  }
}

export async function productoRepositorioAdmin(): Promise<ProductoRepositorioAdmin> {
  return crearRepositorioAdmin(await createClient())
}
