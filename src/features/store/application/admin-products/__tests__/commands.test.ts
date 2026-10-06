import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createProduct,
  updateProduct,
  deactivateProduct,
} from '@/features/store/application/admin-products/commands'
import type { ProductWrite } from '@/features/store/application/admin-products/ports'
import {
  createFakeAdminProductRepository,
  type FakeAdminProductRepository,
} from './fake-product-repository'
import { makeProduct } from './product-fixture'

const validModel = (): ProductWrite => ({
  slug: 'cepillo-limpiador-lashary',
  name: 'Cepillo limpiador Lashary',
  description: 'Accesorio para limpieza suave diaria.',
  imageUrl: '/productos/cepillo-limpiador.jpg',
  priceCrc: 12000,
  displayOrder: 2,
})

const deps = (repo: FakeAdminProductRepository, id = 'nuevo-id') => ({
  repo,
  newId: () => id,
})

describe('createProduct', () => {
  it('crea y persiste un producto válido', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await createProduct(deps(repo, 'abc'))(validModel())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('abc')
    expect(result.value.priceCrc).toBe(12000)
    expect(repo.saveCalls).toBe(1)
    expect(await repo.findById('abc')).not.toBeNull()
  })

  it('rechaza y no persiste un producto inválido', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await createProduct(deps(repo))({ ...validModel(), slug: '' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('InvalidProduct')
    expect(repo.saveCalls).toBe(0)
  })

  it('rechaza montos no enteros', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await createProduct(deps(repo))({ ...validModel(), priceCrc: 12000.5 })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })

  it('DOM-006: devuelve ProductoSlugDuplicado si el slug ya existe, no un Error genérico', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'existente', slug: 'cepillo-limpiador-lashary' }),
    ])
    const result = await createProduct(deps(repo, 'nuevo'))(validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('DuplicateProductSlug')
    expect(repo.saveCalls).toBe(0)
  })
})

describe('updateProduct', () => {
  it('actualiza un producto existente conservando su estado activo', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'e1', isActive: true })])
    const result = await updateProduct(deps(repo))('e1', {
      ...validModel(),
      name: 'Renombrado',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Renombrado')
    expect(result.value.isActive).toBe(true)
    expect(result.value.id).toBe('e1')
  })

  it('preserva activo=false al actualizar un producto desactivado', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'e2', isActive: false })])
    const result = await updateProduct(deps(repo))('e2', validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve ProductoNoEncontrado si no existe', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await updateProduct(deps(repo))('nope', validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('ProductNotFound')
  })

  it('rechaza cambios inválidos sin persistir', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'e3' })])
    const before = repo.saveCalls
    const result = await updateProduct(deps(repo))('e3', { ...validModel(), name: '   ' })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(before)
  })

  it('DOM-006: renombrar el slug a uno ya usado por otro producto devuelve ProductoSlugDuplicado', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'e4', slug: 'slug-a' }),
      makeProduct({ id: 'e5', slug: 'slug-b' }),
    ])
    const result = await updateProduct(deps(repo))('e5', { ...validModel(), slug: 'slug-a' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('DuplicateProductSlug')
  })
})

describe('deactivateProduct', () => {
  it('desactiva un producto existente', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'd1', isActive: true })])
    const result = await deactivateProduct(deps(repo))('d1')
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.isActive).toBe(false)
    expect((await repo.findById('d1'))?.isActive).toBe(false)
  })

  it('devuelve ProductoNoEncontrado si no existe', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await deactivateProduct(deps(repo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
