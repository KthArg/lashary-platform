import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  listAdminProducts,
  getAdminProduct,
} from '@/features/store/application/admin-products/queries'
import { createFakeAdminProductRepository } from './fake-product-repository'
import { makeProduct } from './product-fixture'

describe('listarProductosAdmin', () => {
  it('devuelve solo activos por defecto, como ProductoAdminVista', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'a', isActive: true }),
      makeProduct({ id: 'b', isActive: false }),
    ])
    const page = await listAdminProducts(repo)()
    expect(page.items.map((product) => product.id)).toEqual(['a'])
    expect(page.total).toBe(1)
    expect(typeof page.items[0].priceCrc).toBe('number')
  })

  it('incluye inactivos cuando activeOnly = false', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'a', isActive: true }),
      makeProduct({ id: 'b', isActive: false }),
    ])
    const page = await listAdminProducts(repo)({ activeOnly: false })
    expect(page.total).toBe(2)
  })

  it('pagina con tamaño por defecto 50 y tope 100', async () => {
    const repo = createFakeAdminProductRepository(
      Array.from({ length: 120 }, (_, i) => makeProduct({ id: `p${i}`, displayOrder: i })),
    )
    const first = await listAdminProducts(repo)({ page: 1, activeOnly: false })
    expect(first.items).toHaveLength(50)
    expect(first.pageSize).toBe(50)

    const capped = await listAdminProducts(repo)({ pageSize: 999, activeOnly: false })
    expect(capped.pageSize).toBe(100)
    expect(capped.items).toHaveLength(100)
  })

  it('normaliza page y pageSize inválidos', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'a' })])
    const page = await listAdminProducts(repo)({ page: 0, pageSize: -5 })
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
  })
})

describe('obtenerProductoAdmin', () => {
  it('devuelve el producto cuando existe', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'x' })])
    const result = await getAdminProduct(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.id).toBe('x')
  })

  it('devuelve ProductoNoEncontrado cuando no existe', async () => {
    const repo = createFakeAdminProductRepository([])
    const result = await getAdminProduct(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.kind).toBe('ProductNotFound')
      expect(result.error.productId).toBe('nope')
    }
  })
})
