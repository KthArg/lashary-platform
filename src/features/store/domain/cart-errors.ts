export type InvalidCartQuantity = {
  kind: 'InvalidCartQuantity'
  code: 'STORE_CARRITO_CANTIDAD_INVALIDA'
  message: string
  quantity: number
}

export type CartProductUnavailable = {
  kind: 'CartProductUnavailable'
  code: 'STORE_CARRITO_PRODUCTO_NO_DISPONIBLE'
  message: string
  productId: string
}

export type CartLineNotFound = {
  kind: 'CartLineNotFound'
  code: 'STORE_CARRITO_LINEA_NO_ENCONTRADA'
  message: string
  productId: string
}

export function createInvalidCartQuantity(quantity: number): InvalidCartQuantity {
  return {
    kind: 'InvalidCartQuantity',
    code: 'STORE_CARRITO_CANTIDAD_INVALIDA',
    message: `cantidad inválida en el carrito: ${quantity}`,
    quantity,
  }
}

export function createCartProductUnavailable(productId: string): CartProductUnavailable {
  return {
    kind: 'CartProductUnavailable',
    code: 'STORE_CARRITO_PRODUCTO_NO_DISPONIBLE',
    message: `el producto ${productId} no está disponible en la tienda`,
    productId,
  }
}

export function createCartLineNotFound(productId: string): CartLineNotFound {
  return {
    kind: 'CartLineNotFound',
    code: 'STORE_CARRITO_LINEA_NO_ENCONTRADA',
    message: `el producto ${productId} no está en el carrito`,
    productId,
  }
}
