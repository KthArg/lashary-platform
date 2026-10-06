import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  listarProductosAdmin,
  obtenerProductoAdmin,
  TAMANO_PAGINA_DEFECTO,
  TAMANO_PAGINA_MAX,
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

  it(`pagina con tamaño por defecto ${TAMANO_PAGINA_DEFECTO} y tope ${TAMANO_PAGINA_MAX}`, async () => {
    const repo = crearFakeProductoRepositorioAdmin(
      Array.from({ length: TAMANO_PAGINA_MAX + 20 }, (_, i) =>
        makeProducto({ id: `p${i}`, ordenPresentacion: i }),
      ),
    )
    const first = await listarProductosAdmin(repo)({ page: 1, activeOnly: false })
    expect(first.items).toHaveLength(TAMANO_PAGINA_DEFECTO)
    expect(first.pageSize).toBe(TAMANO_PAGINA_DEFECTO)

    const capped = await listarProductosAdmin(repo)({
      pageSize: TAMANO_PAGINA_MAX + 1,
      activeOnly: false,
    })
    expect(capped.pageSize).toBe(TAMANO_PAGINA_MAX)
    expect(capped.items).toHaveLength(TAMANO_PAGINA_MAX)
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
