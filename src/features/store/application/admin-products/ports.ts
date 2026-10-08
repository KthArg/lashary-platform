import type { AdminProduct } from '../../domain/product'

export type ProductPage<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type AdminProductListQuery = {
  activeOnly?: boolean
  page?: number
  pageSize?: number
}

export type ProductWrite = {
  slug: string
  name: string
  description: string
  imageUrl: string
  priceCrc: number
  displayOrder: number
}

export interface AdminProductRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: AdminProduct[]; total: number }>

  findById(id: string): Promise<AdminProduct | null>

  save(producto: AdminProduct): Promise<void>
}
