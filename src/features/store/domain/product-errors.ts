export type InvalidProduct = {
  kind: 'InvalidProduct'
  code: 'STORE_PRODUCTO_INVALIDO'
  message: string
  problems: string[]
}

export type ProductNotFound = {
  kind: 'ProductNotFound'
  code: 'STORE_PRODUCTO_NO_ENCONTRADO'
  message: string
  productId: string
}

export type DuplicateProductSlug = {
  kind: 'DuplicateProductSlug'
  code: 'STORE_PRODUCTO_SLUG_DUPLICADO'
  message: string
  slug: string
}

export type PublicProductNotFound = {
  kind: 'PublicProductNotFound'
  code: 'STORE_PRODUCTO_PUBLICO_NO_ENCONTRADO'
  message: string
  slug: string
}

export type InvalidProductImage = {
  kind: 'InvalidProductImage'
  code: 'STORE_IMAGEN_INVALIDA'
  message: string
  problems: string[]
}

export type ProductError =
  | InvalidProduct
  | ProductNotFound
  | DuplicateProductSlug
  | PublicProductNotFound
  | InvalidProductImage

export function createInvalidProduct(problems: string[]): InvalidProduct {
  return {
    kind: 'InvalidProduct',
    code: 'STORE_PRODUCTO_INVALIDO',
    message: `producto inválido: ${problems.join('; ')}`,
    problems,
  }
}

export function createProductNotFound(productId: string): ProductNotFound {
  return {
    kind: 'ProductNotFound',
    code: 'STORE_PRODUCTO_NO_ENCONTRADO',
    message: `no existe el producto ${productId}`,
    productId,
  }
}

export function createDuplicateProductSlug(slug: string): DuplicateProductSlug {
  return {
    kind: 'DuplicateProductSlug',
    code: 'STORE_PRODUCTO_SLUG_DUPLICADO',
    message: `ya existe un producto con el slug "${slug}"`,
    slug,
  }
}

export function createPublicProductNotFound(slug: string): PublicProductNotFound {
  return {
    kind: 'PublicProductNotFound',
    code: 'STORE_PRODUCTO_PUBLICO_NO_ENCONTRADO',
    message: `no hay un producto disponible en la tienda con el slug "${slug}"`,
    slug,
  }
}

export function createInvalidProductImage(problems: string[]): InvalidProductImage {
  return {
    kind: 'InvalidProductImage',
    code: 'STORE_IMAGEN_INVALIDA',
    message: `imagen inválida: ${problems.join('; ')}`,
    problems,
  }
}

export function isDuplicateProductSlug(error: unknown): error is DuplicateProductSlug {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: unknown }).kind === 'DuplicateProductSlug'
  )
}
