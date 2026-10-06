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

export type ProductError = InvalidProduct | ProductNotFound | DuplicateProductSlug

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

export function isDuplicateProductSlug(error: unknown): error is DuplicateProductSlug {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { kind?: unknown }).kind === 'DuplicateProductSlug'
  )
}
