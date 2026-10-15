'use server'

import { revalidatePath } from 'next/cache'
import { CLIENT_PORTAL_ROUTES, getAuthSession } from '@/features/auth'
import { isErr } from '@/shared/result'
import { addToCart, removeFromCart, updateCartQuantity } from '../../../application/cart/commands'
import type {
  CartLineNotFound,
  CartProductUnavailable,
  InvalidCartQuantity,
} from '../../../domain/cart-errors'
import { cartRepository } from '../../../db/cart-repository'
import { addToCartSchema, cartProductSchema, cartQuantitySchema } from '../validation/cart-schema'
import { CART_STRINGS } from '../constants/cart-strings'
import type { CartActionState } from '../types/cart-action-state'

type CartError = InvalidCartQuantity | CartProductUnavailable | CartLineNotFound

const unauthenticated: CartActionState = {
  status: 'unauthenticated',
  message: CART_STRINGS.unauthenticated,
}

const invalidRequest: CartActionState = { status: 'invalid', message: CART_STRINGS.invalidRequest }

async function sessionUserId(): Promise<string | null> {
  const session = await getAuthSession()
  return session?.user.id ?? null
}

function stateFromError(error: CartError): CartActionState {
  switch (error.kind) {
    case 'InvalidCartQuantity':
      return { status: 'invalid', message: CART_STRINGS.invalidQuantity }
    case 'CartProductUnavailable':
      return { status: 'unavailable', message: CART_STRINGS.unavailable }
    case 'CartLineNotFound':
      return { status: 'unavailable', message: CART_STRINGS.lineNotFound }
  }
}

function succeeded(message: string): CartActionState {
  revalidatePath(CLIENT_PORTAL_ROUTES.carrito)
  return { status: 'ok', message }
}

export async function addToCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const userId = await sessionUserId()
  if (userId === null) return unauthenticated

  const parsed = addToCartSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalidRequest

  const { productId, quantity } = parsed.data
  const result = await addToCart({ repo: await cartRepository() })(userId, productId, quantity)
  if (isErr(result)) return stateFromError(result.error)
  return succeeded(CART_STRINGS.added)
}

export async function updateCartQuantityAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const userId = await sessionUserId()
  if (userId === null) return unauthenticated

  const parsed = cartQuantitySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalidRequest

  const { productId, quantity } = parsed.data
  const result = await updateCartQuantity({ repo: await cartRepository() })(
    userId,
    productId,
    quantity,
  )
  if (isErr(result)) return stateFromError(result.error)
  return succeeded(CART_STRINGS.updated)
}

export async function removeFromCartAction(
  _prev: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const userId = await sessionUserId()
  if (userId === null) return unauthenticated

  const parsed = cartProductSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalidRequest

  await removeFromCart({ repo: await cartRepository() })(userId, parsed.data.productId)
  return succeeded(CART_STRINGS.removed)
}
