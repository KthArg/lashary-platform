import { ok, err, isErr, type Result } from '@/shared/result'
import { MIN_CART_QUANTITY, validateCartQuantity } from '../../domain/cart'
import {
  createCartLineNotFound,
  createCartProductUnavailable,
  type CartLineNotFound,
  type CartProductUnavailable,
  type InvalidCartQuantity,
} from '../../domain/cart-errors'
import type { CartDeps } from './ports'

export const addToCart =
  (deps: CartDeps) =>
  async (
    userId: string,
    productId: string,
    quantity: number = MIN_CART_QUANTITY,
  ): Promise<Result<number, InvalidCartQuantity | CartProductUnavailable>> => {
    const addedQuantity = validateCartQuantity(quantity)
    if (isErr(addedQuantity)) return addedQuantity

    if (!(await deps.repo.isProductActive(productId))) {
      return err(createCartProductUnavailable(productId))
    }

    const currentQuantity = (await deps.repo.findQuantity(userId, productId)) ?? 0
    const newQuantity = validateCartQuantity(currentQuantity + addedQuantity.value)
    if (isErr(newQuantity)) return newQuantity

    await deps.repo.saveQuantity(userId, productId, newQuantity.value)
    return ok(newQuantity.value)
  }

export const updateCartQuantity =
  (deps: CartDeps) =>
  async (
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<
    Result<number, InvalidCartQuantity | CartLineNotFound | CartProductUnavailable>
  > => {
    const newQuantity = validateCartQuantity(quantity)
    if (isErr(newQuantity)) return newQuantity

    if ((await deps.repo.findQuantity(userId, productId)) === null) {
      return err(createCartLineNotFound(productId))
    }
    if (!(await deps.repo.isProductActive(productId))) {
      return err(createCartProductUnavailable(productId))
    }

    await deps.repo.saveQuantity(userId, productId, newQuantity.value)
    return ok(newQuantity.value)
  }

export const removeFromCart =
  (deps: CartDeps) =>
  async (userId: string, productId: string): Promise<void> => {
    await deps.repo.remove(userId, productId)
  }
