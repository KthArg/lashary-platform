import type { ProductoAdminVista } from '../../domain/product'

export type PaginaProductos<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type ListaProductosAdminQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

export type ProductoEscritura = {
  slug: string
  nombre: string
  descripcion: string
  urlImagen: string
  precioCrc: number
  ordenPresentacion: number
}

export interface ProductoRepositorioAdmin {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: ProductoAdminVista[]; total: number }>

  findById(id: string): Promise<ProductoAdminVista | null>

  save(producto: ProductoAdminVista): Promise<void>
}
