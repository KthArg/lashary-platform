import type { CartLine } from '../../domain/cart'

export interface CartRepository {
  listLines(userId: string): Promise<CartLine[]>
  findQuantity(userId: string, productId: string): Promise<number | null>
  saveQuantity(userId: string, productId: string, quantity: number): Promise<void>
  remove(userId: string, productId: string): Promise<void>
  isProductActive(productId: string): Promise<boolean>
}

export type CartDeps = {
  repo: CartRepository
}
