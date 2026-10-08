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
  name: string
  description: string
  imageUrl: string
  priceCrc: number
  displayOrder: number
  stock: number
}

export interface ProductImageStorage {
  upload(path: string, bytes: Uint8Array, contentType: string): Promise<string>
  remove(path: string): Promise<void>
  pathFromUrl(url: string): string | null
}

export interface AdminProductRepository {
  list(params: {
    activeOnly: boolean
    offset: number
    limit: number
  }): Promise<{ items: AdminProduct[]; total: number }>

  findById(id: string): Promise<AdminProduct | null>

  listSlugsStartingWith(prefix: string): Promise<string[]>

  save(product: AdminProduct): Promise<void>
}
