import { buildCart, type Cart } from '../../domain/cart'
import type { CartDeps } from './ports'

export const getCart =
  (deps: CartDeps) =>
  async (userId: string): Promise<Cart> =>
    buildCart(await deps.repo.listLines(userId))
