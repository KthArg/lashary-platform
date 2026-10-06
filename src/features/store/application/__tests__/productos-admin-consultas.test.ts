import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  listarProductosAdmin,
  obtenerProductoAdmin,
} from '@/features/store/application/productos-admin-consultas'
import { crearFakeProductoRepositorioAdmin } from './fake-repositorio-productos'
import { makeProducto } from './producto-fixture'

describe('listarProductosAdmin', () => {
  it('devuelve solo activos por defecto, como ProductoAdminVista', async () => {
    const repo = crearFakeProductoRepositorioAdmin([
      makeProducto({ id: 'a', activo: true }),
      makeProducto({ id: 'b', activo: false }),
    ])
    const page = await listarProductosAdmin(repo)()
    expect(page.items.map((p) => p.id)).toEqual(['a'])
    expect(page.total).toBe(1)
    expect(typeof page.items[0].precioCrc).toBe('number')
  })

  it('incluye inactivos cuando activeOnly = false', async () => {
    const repo = crearFakeProductoRepositorioAdmin([
      makeProducto({ id: 'a', activo: true }),
      makeProducto({ id: 'b', activo: false }),
    ])
    const page = await listarProductosAdmin(repo)({ activeOnly: false })
    expect(page.total).toBe(2)
  })

  it('pagina con tamaño por defecto 50 y tope 100', async () => {
    const repo = crearFakeProductoRepositorioAdmin(
      Array.from({ length: 120 }, (_, i) => makeProducto({ id: `p${i}`, ordenPresentacion: i })),
    )
    const first = await listarProductosAdmin(repo)({ page: 1, activeOnly: false })
    expect(first.items).toHaveLength(50)
    expect(first.pageSize).toBe(50)

    const capped = await listarProductosAdmin(repo)({ pageSize: 999, activeOnly: false })
    expect(capped.pageSize).toBe(100)
    expect(capped.items).toHaveLength(100)
  })

  it('normaliza page y pageSize inválidos', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'a' })])
    const page = await listarProductosAdmin(repo)({ page: 0, pageSize: -5 })
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
  })
})

describe('obtenerProductoAdmin', () => {
  it('devuelve el producto cuando existe', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'x' })])
    const result = await obtenerProductoAdmin(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.id).toBe('x')
  })

  it('devuelve ProductoNoEncontrado cuando no existe', async () => {
    const repo = crearFakeProductoRepositorioAdmin([])
    const result = await obtenerProductoAdmin(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.tipo).toBe('ProductoNoEncontrado')
      expect(result.error.productoId).toBe('nope')
    }
  })
})
