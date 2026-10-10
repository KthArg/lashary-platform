import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
} from '@/features/store/application/admin-products/commands'
import type { ProductWrite } from '@/features/store/application/admin-products/ports'
import {
  createFakeAdminProductRepository,
  type FakeAdminProductRepository,
} from './fake-product-repository'
import { makeProduct } from './product-fixture'

const validModel = (): ProductWrite => ({
  name: 'Cepillo limpiador Lashary',
  description: 'Accesorio para limpieza suave diaria.',
  imageUrl: '/productos/cepillo-limpiador.jpg',
  priceCrc: 12000,
  displayOrder: 2,
  stock: 7,
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

  it('persiste las existencias que indicó la administradora', async () => {
    const repo = createFakeAdminProductRepository()
    await createProduct(deps(repo, 'con-existencias'))(validModel())
    expect((await repo.findById('con-existencias'))?.stock).toBe(7)
  })

  it('rechaza y no persiste un producto inválido', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await createProduct(deps(repo))({ ...validModel(), name: '' })
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

  it('genera el slug a partir del nombre', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await createProduct(deps(repo, 'con-slug'))(validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.slug).toBe('cepillo-limpiador-lashary')
    expect((await repo.findById('con-slug'))?.slug).toBe('cepillo-limpiador-lashary')
  })

  it('agrega un sufijo numérico si otro producto ya tiene ese slug', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'existente', slug: 'cepillo-limpiador-lashary' }),
      makeProduct({ id: 'existente-2', slug: 'cepillo-limpiador-lashary-2' }),
    ])
    const result = await createProduct(deps(repo, 'nuevo'))(validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.slug).toBe('cepillo-limpiador-lashary-3')
    expect(repo.saveCalls).toBe(1)
  })

  it('cuenta los productos desactivados al buscar un slug libre', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'viejo', slug: 'cepillo-limpiador-lashary', isActive: false }),
    ])
    const result = await createProduct(deps(repo, 'nuevo'))(validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.slug).toBe('cepillo-limpiador-lashary-2')
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

  it('cambia las existencias de un producto existente sin tocar el resto', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'e6', stock: 10 })])
    const result = await updateProduct(deps(repo))('e6', { ...validModel(), stock: 0 })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.stock).toBe(0)
    expect((await repo.findById('e6'))?.stock).toBe(0)
  })

  it('preserva activo=false al actualizar un producto desactivado', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'e2', isActive: false })])
    const result = await updateProduct(deps(repo))('e2', validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve ProductNotFound si no existe', async () => {
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

  it('conserva el slug aunque cambie el nombre, para no romper enlaces compartidos', async () => {
    const repo = createFakeAdminProductRepository([
      makeProduct({ id: 'e4', slug: 'serum-original', name: 'Serum original' }),
    ])
    const result = await updateProduct(deps(repo))('e4', { ...validModel(), name: 'Serum renovado' })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.name).toBe('Serum renovado')
    expect(result.value.slug).toBe('serum-original')
    expect((await repo.findById('e4'))?.slug).toBe('serum-original')
  })
})

describe('activateProduct', () => {
  it('vuelve a activar un producto desactivado', async () => {
    const repo = createFakeAdminProductRepository([makeProduct({ id: 'a1', isActive: false })])
    const result = await activateProduct(deps(repo))('a1')
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(true)
    expect((await repo.findById('a1'))?.isActive).toBe(true)
  })

  it('devuelve ProductNotFound si no existe', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await activateProduct(deps(repo))('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('ProductNotFound')
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

  it('devuelve ProductNotFound si no existe', async () => {
    const repo = createFakeAdminProductRepository()
    const result = await deactivateProduct(deps(repo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
