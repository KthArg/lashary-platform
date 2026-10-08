export type InvalidProduct = {
  tipo: 'InvalidProduct'
  code: 'STORE_PRODUCTO_INVALIDO'
  message: string
  problems: string[]
}

export type ProductNotFound = {
  tipo: 'ProductNotFound'
  code: 'STORE_PRODUCTO_NO_ENCONTRADO'
  message: string
  productoId: string
}

export type DuplicateProductSlug = {
  tipo: 'DuplicateProductSlug'
  code: 'STORE_PRODUCTO_SLUG_DUPLICADO'
  message: string
  slug: string
}

export type ProductError = InvalidProduct | ProductNotFound | DuplicateProductSlug

export function createInvalidProduct(problems: string[]): InvalidProduct {
  return {
    tipo: 'InvalidProduct',
    code: 'STORE_PRODUCTO_INVALIDO',
    message: `producto inválido: ${problems.join('; ')}`,
    problems,
  }
}

export function createProductNotFound(productoId: string): ProductNotFound {
  return {
    tipo: 'ProductNotFound',
    code: 'STORE_PRODUCTO_NO_ENCONTRADO',
    message: `no existe el producto ${productoId}`,
    productoId,
  }
}

export function createDuplicateProductSlug(slug: string): DuplicateProductSlug {
  return {
    tipo: 'DuplicateProductSlug',
    code: 'STORE_PRODUCTO_SLUG_DUPLICADO',
    message: `ya existe un producto con el slug "${slug}"`,
    slug,
  }
}

export function isDuplicateProductSlug(error: unknown): error is DuplicateProductSlug {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { tipo?: unknown }).tipo === 'DuplicateProductSlug'
  )
}
