import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createPackage,
  updatePackage,
  deactivatePackage,
} from '@/features/catalog/application/packages/commands'
import {
  isPackageNameConflict,
  isPackageNotFound,
  isPackageValidationError,
} from '@/features/catalog/domain/packages/errors'
import type { PackageWriteModel } from '@/features/catalog/application/packages/ports'
import { createFakeTechniqueRepository, type FakeTechniqueRepository } from '../../techniques/__tests__/fake-repository'
import { createFakePackageRepository } from './fake-package-repository'
import { makeTechnique } from '../../techniques/__tests__/technique-fixture'
import { makePackage } from './package-fixture'

const validModel = (techniqueIds: string[]): PackageWriteModel => ({
  name: 'Combo cejas',
  techniqueIds,
  price: 30000,
})

const deps = (
  packageRepo: ReturnType<typeof createFakePackageRepository>,
  techniqueRepo: FakeTechniqueRepository,
  id = 'nuevo-id',
) => ({ packageRepo, techniqueRepo, newId: () => id })

describe('createPackage', () => {
  it('crea y persiste un paquete con dos técnicas existentes y activas (criterio 1)', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await createPackage(deps(packageRepo, techniqueRepo, 'p1'))(
      validModel(['t1', 't2']),
    )
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('p1')
    expect(result.value.price).toBe(30000)
    expect(packageRepo.saveCalls).toBe(1)
  })

  it('rechaza y no persiste si alguna técnica no existe', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await createPackage(deps(packageRepo, techniqueRepo))(
      validModel(['t1', 'no-existe']),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result) && isPackageValidationError(result.error)) {
      expect(result.error.problems.join(' ')).toMatch(/no existen/i)
    } else {
      expect.fail('esperaba PackageValidationError')
    }
    expect(packageRepo.saveCalls).toBe(0)
  })

  it('rechaza y no persiste si alguna técnica está inactiva', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: false }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await createPackage(deps(packageRepo, techniqueRepo))(
      validModel(['t1', 't2']),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result) && isPackageValidationError(result.error)) {
      expect(result.error.problems.join(' ')).toMatch(/no están activas/i)
    } else {
      expect.fail('esperaba PackageValidationError')
    }
    expect(packageRepo.saveCalls).toBe(0)
  })

  it('rechaza menos de dos técnicas (delegado a buildPackage)', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await createPackage(deps(packageRepo, techniqueRepo))(validModel(['t1']))
    expect(isErr(result)).toBe(true)
    expect(packageRepo.saveCalls).toBe(0)
  })

  it('rechaza precio no entero', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await createPackage(deps(packageRepo, techniqueRepo))({
      ...validModel(['t1', 't2']),
      price: 30000.5,
    })
    expect(isErr(result)).toBe(true)
    expect(packageRepo.saveCalls).toBe(0)
  })

  it('DOM-006: devuelve PackageNameConflict si el nombre ya existe, no un Error genérico', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'existente', name: 'Combo cejas' }),
    ])
    const result = await createPackage(deps(packageRepo, techniqueRepo, 'nuevo'))(
      validModel(['t1', 't2']),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isPackageNameConflict(result.error)).toBe(true)
    expect(packageRepo.saveCalls).toBe(0)
  })
})

describe('updatePackage', () => {
  it('actualiza un paquete existente conservando su estado activo', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'e1', techniqueIds: ['t1', 't2'], isActive: true }),
    ])
    const result = await updatePackage(deps(packageRepo, techniqueRepo))('e1', {
      ...validModel(['t1', 't2']),
      name: 'Renombrado',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Renombrado')
    expect(result.value.isActive).toBe(true)
  })

  it('preserva isActive=false al actualizar un paquete desactivado', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'e2', techniqueIds: ['t1', 't2'], isActive: false }),
    ])
    const result = await updatePackage(deps(packageRepo, techniqueRepo))(
      'e2',
      validModel(['t1', 't2']),
    )
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve PackageNotFound si no existe', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository()
    const result = await updatePackage(deps(packageRepo, techniqueRepo))(
      'nope',
      validModel(['t1', 't2']),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isPackageNotFound(result.error)).toBe(true)
  })

  it('rechaza técnicas inválidas sin persistir', async () => {
    const techniqueRepo = createFakeTechniqueRepository([
      makeTechnique({ id: 't1', isActive: true }),
      makeTechnique({ id: 't2', isActive: true }),
    ])
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'e3', techniqueIds: ['t1', 't2'] }),
    ])
    const before = packageRepo.saveCalls
    const result = await updatePackage(deps(packageRepo, techniqueRepo))('e3', {
      ...validModel(['t1', 'no-existe']),
    })
    expect(isErr(result)).toBe(true)
    expect(packageRepo.saveCalls).toBe(before)
  })
})

describe('deactivatePackage', () => {
  it('desactiva un paquete existente', async () => {
    const techniqueRepo = createFakeTechniqueRepository()
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'd1', isActive: true }),
    ])
    const result = await deactivatePackage(deps(packageRepo, techniqueRepo))('d1')
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.isActive).toBe(false)
    expect((await packageRepo.findById('d1'))?.pkg.isActive).toBe(false)
  })

  it('devuelve PackageNotFound si no existe', async () => {
    const techniqueRepo = createFakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const result = await deactivatePackage(deps(packageRepo, techniqueRepo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
