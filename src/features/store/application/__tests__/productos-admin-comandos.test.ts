import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  crearProducto,
  actualizarProducto,
  desactivarProducto,
} from '@/features/store/application/productos-admin-comandos'
import type { ProductoEscritura } from '@/features/store/application/productos-admin-puertos'
import {
  crearFakeProductoRepositorioAdmin,
  type FakeProductoRepositorioAdmin,
} from './fake-repositorio-productos'
import { makeProducto } from './producto-fixture'

const validModel = (): ProductoEscritura => ({
  slug: 'cepillo-limpiador-lashary',
  nombre: 'Cepillo limpiador Lashary',
  descripcion: 'Accesorio para limpieza suave diaria.',
  urlImagen: '/productos/cepillo-limpiador.jpg',
  precioCrc: 12000,
  ordenPresentacion: 2,
})

const deps = (repo: FakeProductoRepositorioAdmin, id = 'nuevo-id') => ({
  repo,
  newId: () => id,
})

describe('crearProducto', () => {
  it('crea y persiste un producto válido', async () => {
    const repo = crearFakeProductoRepositorioAdmin()
    const result = await crearProducto(deps(repo, 'abc'))(validModel())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('abc')
    expect(result.value.precioCrc).toBe(12000)
    expect(repo.saveCalls).toBe(1)
    expect(await repo.findById('abc')).not.toBeNull()
  })

  it('rechaza y no persiste un producto inválido', async () => {
    const repo = crearFakeProductoRepositorioAdmin()
    const result = await crearProducto(deps(repo))({ ...validModel(), slug: '' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.tipo).toBe('ProductoInvalido')
    expect(repo.saveCalls).toBe(0)
  })

  it('rechaza montos no enteros', async () => {
    const repo = crearFakeProductoRepositorioAdmin()
    const result = await crearProducto(deps(repo))({ ...validModel(), precioCrc: 12000.5 })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })

  it('DOM-006: devuelve ProductoSlugDuplicado si el slug ya existe, no un Error genérico', async () => {
    const repo = crearFakeProductoRepositorioAdmin([
      makeProducto({ id: 'existente', slug: 'cepillo-limpiador-lashary' }),
    ])
    const result = await crearProducto(deps(repo, 'nuevo'))(validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.tipo).toBe('ProductoSlugDuplicado')
    expect(repo.saveCalls).toBe(0)
  })
})

describe('actualizarProducto', () => {
  it('actualiza un producto existente conservando su estado activo', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'e1', activo: true })])
    const result = await actualizarProducto(deps(repo))('e1', {
      ...validModel(),
      nombre: 'Renombrado',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.nombre).toBe('Renombrado')
    expect(result.value.activo).toBe(true)
    expect(result.value.id).toBe('e1')
  })

  it('preserva activo=false al actualizar un producto desactivado', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'e2', activo: false })])
    const result = await actualizarProducto(deps(repo))('e2', validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.activo).toBe(false)
  })

  it('devuelve ProductoNoEncontrado si no existe', async () => {
    const repo = crearFakeProductoRepositorioAdmin()
    const result = await actualizarProducto(deps(repo))('nope', validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.tipo).toBe('ProductoNoEncontrado')
  })

  it('rechaza cambios inválidos sin persistir', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'e3' })])
    const before = repo.saveCalls
    const result = await actualizarProducto(deps(repo))('e3', { ...validModel(), nombre: '   ' })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(before)
  })

  it('DOM-006: renombrar el slug a uno ya usado por otro producto devuelve ProductoSlugDuplicado', async () => {
    const repo = crearFakeProductoRepositorioAdmin([
      makeProducto({ id: 'e4', slug: 'slug-a' }),
      makeProducto({ id: 'e5', slug: 'slug-b' }),
    ])
    const result = await actualizarProducto(deps(repo))('e5', { ...validModel(), slug: 'slug-a' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.tipo).toBe('ProductoSlugDuplicado')
  })
})

describe('desactivarProducto', () => {
  it('desactiva un producto existente', async () => {
    const repo = crearFakeProductoRepositorioAdmin([makeProducto({ id: 'd1', activo: true })])
    const result = await desactivarProducto(deps(repo))('d1')
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.activo).toBe(false)
    expect((await repo.findById('d1'))?.activo).toBe(false)
  })

  it('devuelve ProductoNoEncontrado si no existe', async () => {
    const repo = crearFakeProductoRepositorioAdmin()
    const result = await desactivarProducto(deps(repo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
