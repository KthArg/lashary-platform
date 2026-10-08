export type ProductoInvalido = {
  tipo: 'ProductoInvalido'
  code: 'STORE_PRODUCTO_INVALIDO'
  message: string
  problems: string[]
}

export type ProductoNoEncontrado = {
  tipo: 'ProductoNoEncontrado'
  code: 'STORE_PRODUCTO_NO_ENCONTRADO'
  message: string
  productoId: string
}

export type ProductoSlugDuplicado = {
  tipo: 'ProductoSlugDuplicado'
  code: 'STORE_PRODUCTO_SLUG_DUPLICADO'
  message: string
  slug: string
}

export type ProductoError = ProductoInvalido | ProductoNoEncontrado | ProductoSlugDuplicado

export function crearProductoInvalido(problems: string[]): ProductoInvalido {
  return {
    tipo: 'ProductoInvalido',
    code: 'STORE_PRODUCTO_INVALIDO',
    message: `producto inválido: ${problems.join('; ')}`,
    problems,
  }
}

export function crearProductoNoEncontrado(productoId: string): ProductoNoEncontrado {
  return {
    tipo: 'ProductoNoEncontrado',
    code: 'STORE_PRODUCTO_NO_ENCONTRADO',
    message: `no existe el producto ${productoId}`,
    productoId,
  }
}

export function crearProductoSlugDuplicado(slug: string): ProductoSlugDuplicado {
  return {
    tipo: 'ProductoSlugDuplicado',
    code: 'STORE_PRODUCTO_SLUG_DUPLICADO',
    message: `ya existe un producto con el slug "${slug}"`,
    slug,
  }
}

export function esProductoSlugDuplicado(error: unknown): error is ProductoSlugDuplicado {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { tipo?: unknown }).tipo === 'ProductoSlugDuplicado'
  )
}
