import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { listPackages, getPackage } from '@/features/catalog/application/queries'
import { PackageNotFound } from '@/features/catalog/domain/errors'
import { FakePackageRepository } from './fake-package-repository'
import { makePackage } from './package-fixture'

describe('listPackages', () => {
  it('devuelve solo activos por defecto, con duración total calculada (criterio 2)', async () => {
    const repo = new FakePackageRepository(
      [
        makePackage({ id: 'a', name: 'A', isActive: true }),
        makePackage({ id: 'b', name: 'B', isActive: false }),
      ],
      () => 195, // p.ej. 120 + 75 minutos de dos técnicas
    )
    const page = await listPackages(repo)()
    expect(page.items.map((p) => p.id)).toEqual(['a'])
    expect(page.total).toBe(1)
    expect(page.items[0].durationTotalMin).toBe(195)
    expect(typeof page.items[0].price).toBe('number')
  })

  it('incluye inactivos cuando activeOnly = false', async () => {
    const repo = new FakePackageRepository([
      makePackage({ id: 'a', isActive: true }),
      makePackage({ id: 'b', isActive: false }),
    ])
    const page = await listPackages(repo)({ activeOnly: false })
    expect(page.total).toBe(2)
  })

  it('pagina con tamaño por defecto 50 y tope 100', async () => {
    const repo = new FakePackageRepository(
      Array.from({ length: 120 }, (_, i) =>
        makePackage({ id: `p${i}`, name: `P${String(i).padStart(3, '0')}` }),
      ),
    )
    const first = await listPackages(repo)({ page: 1 })
    expect(first.items).toHaveLength(50)
    expect(first.pageSize).toBe(50)

    const capped = await listPackages(repo)({ pageSize: 999 })
    expect(capped.pageSize).toBe(100)
    expect(capped.items).toHaveLength(100)
  })

  it('normaliza page y pageSize inválidos', async () => {
    const repo = new FakePackageRepository([makePackage({ id: 'a' })])
    const page = await listPackages(repo)({ page: 0, pageSize: -5 })
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
  })
})

describe('getPackage', () => {
  it('devuelve el paquete con su duración cuando existe', async () => {
    const repo = new FakePackageRepository([makePackage({ id: 'x' })], () => 90)
    const result = await getPackage(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.id).toBe('x')
      expect(result.value.durationTotalMin).toBe(90)
    }
  })

  it('devuelve PackageNotFound cuando no existe', async () => {
    const repo = new FakePackageRepository([])
    const result = await getPackage(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error).toBeInstanceOf(PackageNotFound)
      expect(result.error.packageId).toBe('nope')
    }
  })
})
