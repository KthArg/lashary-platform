import { describe, it, expect, vi } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  listPackages,
  getPackage,
  listPackageTechniques,
} from '@/features/catalog/application/packages/queries'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/features/catalog/application/pagination'
import { createFakeTechniqueRepository } from '../../techniques/__tests__/fake-repository'
import { makeTechnique } from '../../techniques/__tests__/technique-fixture'
import { isPackageNotFound } from '@/features/catalog/domain/packages/errors'
import { createFakePackageRepository } from './fake-package-repository'
import { makePackage } from './package-fixture'

const SET_CLASICO_MIN = 120
const DISENO_CEJAS_MIN = 75
const DURACION_DOS_TECNICAS = SET_CLASICO_MIN + DISENO_CEJAS_MIN
const DURACION_PAQUETE = 90

describe('listPackages', () => {
  it('devuelve solo activos por defecto, con duración total calculada (criterio 2)', async () => {
    const repo = createFakePackageRepository(
      [
        makePackage({ id: 'a', name: 'A', isActive: true }),
        makePackage({ id: 'b', name: 'B', isActive: false }),
      ],
      () => DURACION_DOS_TECNICAS,
    )
    const page = await listPackages(repo)()
    expect(page.items.map((packageItem) => packageItem.id)).toEqual(['a'])
    expect(page.total).toBe(1)
    expect(page.items[0].durationTotalMin).toBe(DURACION_DOS_TECNICAS)
    expect(typeof page.items[0].price).toBe('number')
  })

  it('incluye inactivos cuando activeOnly = false', async () => {
    const repo = createFakePackageRepository([
      makePackage({ id: 'a', isActive: true }),
      makePackage({ id: 'b', isActive: false }),
    ])
    const page = await listPackages(repo)({ activeOnly: false })
    expect(page.total).toBe(2)
  })

  it('pagina con el tamaño por defecto y respeta el tope', async () => {
    const repo = createFakePackageRepository(
      Array.from({ length: MAX_PAGE_SIZE + 20 }, (_, i) =>
        makePackage({ id: `p${i}`, name: `P${String(i).padStart(3, '0')}` }),
      ),
    )
    const first = await listPackages(repo)({ page: 1 })
    expect(first.items).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(first.pageSize).toBe(DEFAULT_PAGE_SIZE)

    const capped = await listPackages(repo)({ pageSize: MAX_PAGE_SIZE * 10 })
    expect(capped.pageSize).toBe(MAX_PAGE_SIZE)
    expect(capped.items).toHaveLength(MAX_PAGE_SIZE)
  })

  it('normaliza page y pageSize inválidos', async () => {
    const repo = createFakePackageRepository([makePackage({ id: 'a' })])
    const page = await listPackages(repo)({ page: 0, pageSize: -5 })
    expect(page.page).toBe(1)
    expect(page.pageSize).toBe(1)
  })
})

describe('getPackage', () => {
  it('devuelve el paquete con su duración cuando existe', async () => {
    const repo = createFakePackageRepository([makePackage({ id: 'x' })], () => DURACION_PAQUETE)
    const result = await getPackage(repo)('x')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.id).toBe('x')
      expect(result.value.durationTotalMin).toBe(DURACION_PAQUETE)
    }
  })

  it('devuelve PackageNotFound cuando no existe', async () => {
    const repo = createFakePackageRepository([])
    const result = await getPackage(repo)('nope')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(isPackageNotFound(result.error)).toBe(true)
      expect(result.error.packageId).toBe('nope')
    }
  })
})

describe('listPackageTechniques', () => {
  it('resuelve las técnicas de varios paquetes en una sola consulta, sin repetir ids', async () => {
    const repo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', name: 'Set clásico', isActive: true }),
      makeTechnique({ id: 't2', name: 'Henna', isActive: false }),
      makeTechnique({ id: 't3', name: 'Laminado', isActive: true }),
    ])
    const findByIds = vi.spyOn(repo, 'findByIds')

    const techniques = await listPackageTechniques(repo)([
      { techniqueIds: ['t1', 't2'] },
      { techniqueIds: ['t2', 't3'] },
    ])

    expect(findByIds).toHaveBeenCalledTimes(1)
    expect(findByIds).toHaveBeenCalledWith(['t1', 't2', 't3'])
    expect(techniques.map((technique) => [technique.name, technique.isActive])).toEqual([
      ['Set clásico', true],
      ['Henna', false],
      ['Laminado', true],
    ])
  })
})
